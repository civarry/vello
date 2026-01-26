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

const smtpConfigSchema = z.object({
    name: z.string().min(1, "Name is required"),
    providerId: z.string().min(1),
    senderEmail: z.string().email(),
    senderName: z.string().optional(),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    isDefault: z.boolean().optional(),
});

/**
 * GET /api/smtp/config
 * Get all SMTP configurations for the organization
 * Query params:
 *   - default=true: Get only the default config
 *   - id=xxx: Get a specific config by ID
 */
export async function GET(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to get SMTP config: unauthorized", {
                action: "get_smtp_config",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can view SMTP config
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to get SMTP config: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "get_smtp_config",
            });
            return createForbiddenResponse("You don't have permission to view SMTP settings");
        }

        const searchParams = request.nextUrl.searchParams;
        const getDefault = searchParams.get("default") === "true";
        const configId = searchParams.get("id");

        // Get specific config by ID
        if (configId) {
            const config = await prisma.sMTPConfiguration.findFirst({
                where: {
                    id: configId,
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
        }

        // Get default config only
        if (getDefault) {
            const config = await prisma.sMTPConfiguration.findFirst({
                where: {
                    organizationId: context.currentMembership.organization.id,
                    isDefault: true,
                },
                include: {
                    provider: true,
                    organization: {
                        select: { name: true },
                    },
                },
            });

            if (!config) {
                return NextResponse.json({
                    data: null,
                    organizationName: context.currentMembership.organization.name,
                });
            }

            const { smtpPassword, ...safeConfig } = config;
            return NextResponse.json({
                data: safeConfig,
                organizationName: config.organization?.name,
            });
        }

        // Get all configs
        const configs = await prisma.sMTPConfiguration.findMany({
            where: {
                organizationId: context.currentMembership.organization.id,
            },
            include: {
                provider: true,
            },
            orderBy: [
                { isDefault: "desc" },
                { createdAt: "desc" },
            ],
        });

        // Remove passwords from response
        const safeConfigs = configs.map(({ smtpPassword, ...config }) => config);

        logInfo("Retrieved SMTP configs", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            count: configs.length,
            action: "get_smtp_configs",
        });

        return NextResponse.json({
            data: safeConfigs,
            organizationName: context.currentMembership.organization.name,
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
 * POST /api/smtp/config
 * Create a new SMTP configuration
 */
export async function POST(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to save SMTP config: unauthorized", {
                action: "save_smtp_config",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can manage SMTP config
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to save SMTP config: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "save_smtp_config",
            });
            return createForbiddenResponse("You don't have permission to manage SMTP settings");
        }

        const body = await request.json();
        const validated = smtpConfigSchema.parse(body);

        // Verify provider exists
        const provider = await prisma.emailProvider.findUnique({
            where: { id: validated.providerId },
        });

        if (!provider) {
            return NextResponse.json(
                { error: "Invalid email provider. Please select a valid provider." },
                { status: 400 }
            );
        }

        // Password is required for new configuration
        if (!validated.smtpPassword) {
            return NextResponse.json(
                { error: "Password is required for new configuration" },
                { status: 400 }
            );
        }

        let encryptedPassword: string;
        try {
            encryptedPassword = encrypt(validated.smtpPassword);
        } catch (encryptError) {
            logError(
                "Encryption failed",
                encryptError instanceof Error ? encryptError : new Error(String(encryptError)),
                { action: "save_smtp_config" }
            );
            return NextResponse.json(
                { error: "Failed to encrypt password. Please check ENCRYPTION_KEY is configured." },
                { status: 500 }
            );
        }

        // Check if this should be default (first config or explicitly set)
        const existingCount = await prisma.sMTPConfiguration.count({
            where: { organizationId: context.currentMembership.organization.id },
        });

        const shouldBeDefault = validated.isDefault || existingCount === 0;

        // If this is set as default, unset other defaults
        if (shouldBeDefault) {
            await prisma.sMTPConfiguration.updateMany({
                where: {
                    organizationId: context.currentMembership.organization.id,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        const config = await prisma.sMTPConfiguration.create({
            data: {
                organizationId: context.currentMembership.organization.id,
                providerId: validated.providerId,
                name: validated.name,
                senderEmail: validated.senderEmail,
                senderName: validated.senderName,
                smtpUsername: validated.smtpUsername,
                smtpPassword: encryptedPassword,
                emailSubject: validated.emailSubject,
                emailBody: validated.emailBody,
                isDefault: shouldBeDefault,
            },
            include: {
                provider: true,
            },
        });

        const { smtpPassword, ...safeConfig } = config;

        logInfo("Created SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            configId: config.id,
            action: "create_smtp_config",
        });

        return NextResponse.json({ data: safeConfig });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0];
            const field = firstError.path.join(".");
            return NextResponse.json(
                { error: `Validation failed: ${field} - ${firstError.message}`, details: error.issues },
                { status: 400 }
            );
        }

        logError(
            "Failed to save SMTP config",
            error instanceof Error ? error : new Error(String(error)),
            { action: "save_smtp_config" }
        );

        return createErrorResponse(error, "Failed to save SMTP configuration", 500);
    }
}

/**
 * DELETE /api/smtp/config
 * Delete SMTP configuration by ID (query param)
 */
export async function DELETE(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to delete SMTP config: unauthorized", {
                action: "delete_smtp_config",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can delete SMTP config
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to delete SMTP config: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "delete_smtp_config",
            });
            return createForbiddenResponse("You don't have permission to manage SMTP settings");
        }

        const searchParams = request.nextUrl.searchParams;
        const configId = searchParams.get("id");

        if (!configId) {
            return NextResponse.json({ error: "Config ID is required" }, { status: 400 });
        }

        // Verify config belongs to this organization
        const config = await prisma.sMTPConfiguration.findFirst({
            where: {
                id: configId,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!config) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const wasDefault = config.isDefault;

        await prisma.sMTPConfiguration.delete({
            where: { id: configId },
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
            configId,
            action: "delete_smtp_config",
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
