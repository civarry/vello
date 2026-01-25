import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";

/**
 * GET /api/smtp/providers
 * List all available email providers
 */
export async function GET() {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to get email providers: unauthorized", {
                action: "get_email_providers",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can view providers
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to get email providers: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "get_email_providers",
            });
            return createForbiddenResponse("You don't have permission to view email providers");
        }

        const providers = await prisma.emailProvider.findMany({
            orderBy: {
                name: "asc",
            },
        });

        logInfo("Retrieved email providers", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            count: providers.length,
            action: "get_email_providers",
        });

        return NextResponse.json({ data: providers });
    } catch (error) {
        logError(
            "Failed to get email providers",
            error instanceof Error ? error : new Error(String(error)),
            { action: "get_email_providers" }
        );
        return createErrorResponse(error, "Failed to get email providers", 500);
    }
}
