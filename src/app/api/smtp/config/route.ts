import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { encrypt, decrypt } from "@/lib/email/encryption";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";

const smtpConfigSchema = z.object({
    providerId: z.string().min(1),
    senderEmail: z.string().email(),
    senderName: z.string().optional(),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
});

/**
 * GET /api/smtp/config
 * Get current organization's SMTP configuration
 */
export async function GET() {
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

        const config = await prisma.sMTPConfiguration.findUnique({
            where: {
                organizationId: context.currentMembership.organization.id,
            },
            include: {
                provider: true,
                organization: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!config) {
            // Return organization name even when no SMTP config exists
            return NextResponse.json({
                data: null,
                organizationName: context.currentMembership.organization.name,
            });
        }

        // Don't send the encrypted password to the client
        const { smtpPassword, ...safeConfig } = config;

        logInfo("Retrieved SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            action: "get_smtp_config",
        });

        return NextResponse.json({
            data: safeConfig,
            organizationName: config.organization?.name || context.currentMembership.organization.name,
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
 * Create or update SMTP configuration
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
                { error: "Invalid email provider. Please select a valid provider or run the database seed." },
                { status: 400 }
            );
        }

        // Check if config exists
        const existingConfig = await prisma.sMTPConfiguration.findUnique({
            where: {
                organizationId: context.currentMembership.organization.id,
            },
        });

        let config;

        if (existingConfig) {
            // Update existing configuration
            const updateData: Record<string, unknown> = {
                providerId: validated.providerId,
                senderEmail: validated.senderEmail,
                senderName: validated.senderName,
                smtpUsername: validated.smtpUsername,
                emailSubject: validated.emailSubject,
                emailBody: validated.emailBody,
                updatedAt: new Date(),
            };

            // Only update password if provided
            if (validated.smtpPassword) {
                try {
                    updateData.smtpPassword = encrypt(validated.smtpPassword);
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
            }

            config = await prisma.sMTPConfiguration.update({
                where: {
                    organizationId: context.currentMembership.organization.id,
                },
                data: updateData,
                include: {
                    provider: true,
                },
            });
        } else {
            // Create new configuration
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

            config = await prisma.sMTPConfiguration.create({
                data: {
                    organizationId: context.currentMembership.organization.id,
                    providerId: validated.providerId,
                    senderEmail: validated.senderEmail,
                    senderName: validated.senderName,
                    smtpUsername: validated.smtpUsername,
                    smtpPassword: encryptedPassword,
                    emailSubject: validated.emailSubject,
                    emailBody: validated.emailBody,
                },
                include: {
                    provider: true,
                },
            });
        }

        // Don't send the encrypted password to the client
        const { smtpPassword, ...safeConfig } = config;

        logInfo("Saved SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            action: "save_smtp_config",
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

        // Provide more specific error messages
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ENCRYPTION_KEY")) {
            return NextResponse.json(
                { error: "Server configuration error: ENCRYPTION_KEY is not set." },
                { status: 500 }
            );
        }

        return createErrorResponse(error, "Failed to save SMTP configuration", 500);
    }
}

/**
 * DELETE /api/smtp/config
 * Delete SMTP configuration
 */
export async function DELETE() {
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

        await prisma.sMTPConfiguration.delete({
            where: {
                organizationId: context.currentMembership.organization.id,
            },
        });

        logInfo("Deleted SMTP config", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
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
