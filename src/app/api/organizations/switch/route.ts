import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, switchOrganization } from "@/lib/auth";
import { z } from "zod";
import { organizationIdSchema } from "@/lib/validation";
import { createErrorResponse, createValidationErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/errors";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { logInfo, logError, logWarn } from "@/lib/logging";

const switchOrgSchema = z.object({
    organizationId: organizationIdSchema,
});

/**
 * POST /api/organizations/switch
 * Switches the current user's active organization.
 */
export async function POST(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to switch organization: unauthorized", {
                action: "switch_organization",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Rate limiting: 20 switches per hour per user
        const rateLimitResult = checkRateLimit(
            context.user.id,
            20,
            60 * 60 * 1000 // 1 hour
        );

        if (rateLimitResult.limited) {
            logWarn("Rate limit exceeded for organization switch", {
                userId: context.user.id,
                action: "switch_organization",
            });
            const headers = getRateLimitHeaders(
                rateLimitResult.remaining,
                rateLimitResult.resetAt
            );
            return NextResponse.json(
                {
                    error: "Too many organization switches. Please try again later.",
                    code: "RATE_LIMIT_EXCEEDED",
                },
                { status: 429, headers }
            );
        }

        const body = await request.json();
        const validationResult = switchOrgSchema.safeParse(body);

        if (!validationResult.success) {
            return createValidationErrorResponse(
                validationResult.error.issues[0]?.message || "Validation failed",
                validationResult.error.issues
            );
        }

        const { organizationId } = validationResult.data;

        logInfo("Switching organization", {
            userId: context.user.id,
            fromOrganizationId: context.currentMembership.organization.id,
            toOrganizationId: organizationId,
            action: "switch_organization",
        });

        // Check if trying to switch to current org (no-op)
        if (organizationId === context.currentMembership.organization.id) {
            const headers = getRateLimitHeaders(
                rateLimitResult.remaining,
                rateLimitResult.resetAt
            );
            return NextResponse.json({
                success: true,
                message: "Already in this organization",
                organization: context.currentMembership.organization,
            }, { headers });
        }

        // Check if user has membership in target org
        const targetMembership = context.allMemberships.find(
            (m) => m.organization.id === organizationId
        );

        if (!targetMembership) {
            logWarn("Failed to switch organization: not a member", {
                userId: context.user.id,
                organizationId,
                action: "switch_organization",
            });
            return createForbiddenResponse("You are not a member of this organization");
        }

        // Perform the switch
        const result = await switchOrganization(context.user.id, organizationId);

        if (!result.success) {
            logError("Failed to switch organization", new Error(result.error || "Unknown error"), {
                userId: context.user.id,
                organizationId,
                action: "switch_organization",
            });
            return createErrorResponse(
                new Error(result.error || "Failed to switch organization"),
                result.error || "Failed to switch organization",
                400,
                "SWITCH_ORG_ERROR"
            );
        }

        logInfo("Successfully switched organization", {
            userId: context.user.id,
            organizationId,
            action: "switch_organization",
        });

        const headers = getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetAt
        );

        return NextResponse.json({
            success: true,
            organization: targetMembership.organization,
        }, { headers });
    } catch (error) {
        logError("Failed to switch organization", error instanceof Error ? error : new Error(String(error)), {
            action: "switch_organization",
        });
        return createErrorResponse(error, "Failed to switch organization", 500, "SWITCH_ORG_ERROR");
    }
}
