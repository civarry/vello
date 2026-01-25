import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { testSMTPConnection } from "@/lib/email/smtp-client";
import { encrypt } from "@/lib/email/encryption";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";

const testSMTPSchema = z.object({
    smtpServer: z.string().min(1),
    smtpPort: z.number().min(1).max(65535),
    useTLS: z.boolean(),
    senderEmail: z.string().email(),
    senderName: z.string().optional(),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().min(1),
});

/**
 * POST /api/smtp/test
 * Test SMTP connection with provided credentials
 */
export async function POST(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to test SMTP: unauthorized", {
                action: "test_smtp",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can test SMTP
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to test SMTP: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "test_smtp",
            });
            return createForbiddenResponse("You don't have permission to test SMTP settings");
        }

        const body = await request.json();
        const validated = testSMTPSchema.parse(body);

        // Encrypt password temporarily for testing
        const encryptedPassword = encrypt(validated.smtpPassword);

        // Test connection
        const result = await testSMTPConnection({
            smtpServer: validated.smtpServer,
            smtpPort: validated.smtpPort,
            useTLS: validated.useTLS,
            senderEmail: validated.senderEmail,
            senderName: validated.senderName,
            smtpUsername: validated.smtpUsername,
            smtpPassword: encryptedPassword,
        });

        logInfo("Tested SMTP connection", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            success: result.success,
            action: "test_smtp",
        });

        return NextResponse.json({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }

        logError(
            "Failed to test SMTP connection",
            error instanceof Error ? error : new Error(String(error)),
            { action: "test_smtp" }
        );
        return createErrorResponse(error, "Failed to test SMTP connection", 500);
    }
}
