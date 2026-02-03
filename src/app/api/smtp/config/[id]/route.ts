import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { encrypt } from "@/lib/email/encryption";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

const updateConfigSchema = z.object({
    name: z.string().min(1).optional(),
    providerId: z.string().min(1).optional(),
    senderEmail: z.string().email().optional(),
    senderName: z.string().optional(),
    smtpUsername: z.string().min(1).optional(),
    smtpPassword: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    isDefault: z.boolean().optional(),
});

/**
 * GET /api/smtp/config/[id]
 * Get a specific SMTP configuration
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id } = await params;

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            return createForbiddenResponse("You don't have permission to view SMTP settings");
        }

        const config = await prisma.sMTPConfiguration.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
            },
            include: {
                provider: true,
                organization: {
                    select: { name: true },
                },
            },
        });

        if (!config) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const { smtpPassword, ...safeConfig } = config;
        return NextResponse.json({
            data: safeConfig,
            organizationName: config.organization?.name,
        });
    } catch (error) {
        logError(
            "Failed to get SMTP config",
            error instanceof Error ? error : new Error(String(error)),
            { action: "get_smtp_config" }
        );
        return createErrorResponse(error, "Failed to get SMTP configuration", 500);
    }
}

/**
 * PUT /api/smtp/config/[id]
 * Update a specific SMTP configuration
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id } = await params;

        if (!context) {
            logWarn("Failed to update SMTP config: unauthorized", {
                action: "update_smtp_config",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to update SMTP config: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "update_smtp_config",
            });
            return createForbiddenResponse("You don't have permission to manage SMTP settings");
        }

        // Verify config exists and belongs to organization
        const existingConfig = await prisma.sMTPConfiguration.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!existingConfig) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const body = await request.json();
        const validated = updateConfigSchema.parse(body);

        // If provider is being changed, verify it exists
        if (validated.providerId) {
            const provider = await prisma.emailProvider.findUnique({
                where: { id: validated.providerId },
            });

            if (!provider) {
                return NextResponse.json(
                    { error: "Invalid email provider." },
                    { status: 400 }
                );
            }
        }

        const changes: { field: string; old: any; new: any }[] = [];

        if (validated.name && validated.name !== existingConfig.name) {
            changes.push({ field: "Config Name", old: existingConfig.name, new: validated.name });
        }
        if (validated.senderEmail && validated.senderEmail !== existingConfig.senderEmail) {
            changes.push({ field: "Sender Email", old: existingConfig.senderEmail, new: validated.senderEmail });
        }
        if (validated.senderName !== undefined && validated.senderName !== existingConfig.senderName) {
            changes.push({ field: "Sender Name", old: existingConfig.senderName || "(none)", new: validated.senderName || "(none)" });
        }
        if (validated.smtpUsername && validated.smtpUsername !== existingConfig.smtpUsername) {
            changes.push({ field: "SMTP Username", old: existingConfig.smtpUsername, new: validated.smtpUsername });
        }
        // Don't show password values, just that it changed
        if (validated.smtpPassword) {
            changes.push({ field: "SMTP Password", old: "********", new: "********" });
        }
        if (validated.emailSubject !== undefined && validated.emailSubject !== existingConfig.emailSubject) {
            changes.push({ field: "Default Subject", old: existingConfig.emailSubject || "(none)", new: validated.emailSubject || "(none)" });
        }
        if (validated.emailBody !== undefined && validated.emailBody !== existingConfig.emailBody) {
            changes.push({ field: "Default Body", old: existingConfig.emailBody ? "(content)" : "(none)", new: validated.emailBody ? "(content)" : "(none)" });
        }
        if (validated.isDefault !== undefined && validated.isDefault !== existingConfig.isDefault) {
            changes.push({ field: "Default Config", old: existingConfig.isDefault ? "Yes" : "No", new: validated.isDefault ? "Yes" : "No" });
        }
        if (validated.providerId && validated.providerId !== existingConfig.providerId) {
            // We'd ideally look up provider names, but ID change is sufficient for audit
            changes.push({ field: "Provider", old: existingConfig.providerId, new: validated.providerId });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            ...(validated.name && { name: validated.name }),
            ...(validated.providerId && { providerId: validated.providerId }),
            ...(validated.senderEmail && { senderEmail: validated.senderEmail }),
            ...(validated.senderName !== undefined && { senderName: validated.senderName }),
            ...(validated.smtpUsername && { smtpUsername: validated.smtpUsername }),
            ...(validated.emailSubject !== undefined && { emailSubject: validated.emailSubject }),
            ...(validated.emailBody !== undefined && { emailBody: validated.emailBody }),
            updatedAt: new Date(),
        };

        // Encrypt password if provided
        if (validated.smtpPassword) {
            try {
                updateData.smtpPassword = encrypt(validated.smtpPassword);
            } catch (encryptError) {
                logError(
                    "Encryption failed",
                    encryptError instanceof Error ? encryptError : new Error(String(encryptError)),
                    { action: "update_smtp_config" }
                );
                return NextResponse.json(
                    { error: "Failed to encrypt password." },
                    { status: 500 }
                );
            }
        }

        // Handle isDefault change
        if (validated.isDefault === true) {
            // Unset other defaults first
            await prisma.sMTPConfiguration.updateMany({
                where: {
                    organizationId: context.currentMembership.organization.id,
                    isDefault: true,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
            updateData.isDefault = true;
        }

        const config = await prisma.sMTPConfiguration.update({
            where: { id },
            data: updateData,
            include: {
                provider: true,
            },
        });

        const { smtpPassword, ...safeConfig } = config;

        logInfo("Updated SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            configId: id,
            action: "update_smtp_config",
        });

        // Log audit event
        await logAuditEvent({
            action: "SMTP_CONFIG_UPDATED",
            user: createAuditUserContext(context),
            resource: {
                type: "smtp_config",
                id: config.id,
                name: config.name,
            },
            metadata: {
                changes,
            },
        });

        return NextResponse.json({ data: safeConfig });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0];
            const field = firstError.path.join(".");
            return NextResponse.json(
                { error: `Validation failed: ${field} - ${firstError.message}` },
                { status: 400 }
            );
        }

        logError(
            "Failed to update SMTP config",
            error instanceof Error ? error : new Error(String(error)),
            { action: "update_smtp_config" }
        );

        return createErrorResponse(error, "Failed to update SMTP configuration", 500);
    }
}

/**
 * DELETE /api/smtp/config/[id]
 * Delete a specific SMTP configuration
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id } = await params;

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            return createForbiddenResponse("You don't have permission to manage SMTP settings");
        }

        const config = await prisma.sMTPConfiguration.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!config) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const wasDefault = config.isDefault;

        await prisma.sMTPConfiguration.delete({
            where: { id },
        });

        // If we deleted the default, set another one as default
        if (wasDefault) {
            const nextConfig = await prisma.sMTPConfiguration.findFirst({
                where: { organizationId: context.currentMembership.organization.id },
                orderBy: { createdAt: "asc" },
            });

            if (nextConfig) {
                await prisma.sMTPConfiguration.update({
                    where: { id: nextConfig.id },
                    data: { isDefault: true },
                });
            }
        }

        logInfo("Deleted SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            configId: id,
            action: "delete_smtp_config",
        });

        // Log audit event
        await logAuditEvent({
            action: "SMTP_CONFIG_DELETED",
            user: createAuditUserContext(context),
            resource: {
                type: "smtp_config",
                id: config.id,
                name: config.name,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError(
            "Failed to delete SMTP config",
            error instanceof Error ? error : new Error(String(error)),
            { action: "delete_smtp_config" }
        );
        return createErrorResponse(error, "Failed to delete SMTP configuration", 500);
    }
}
