import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createErrorResponse, createUnauthorizedResponse, createForbiddenResponse, createNotFoundResponse, createValidationErrorResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";

/**
 * DELETE /api/invites/[id]
 * Cancel/delete an invite.
 * Requires members:invite permission.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to cancel invite: unauthorized", {
                action: "cancel_invite",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "members:invite")) {
            logWarn("Failed to cancel invite: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "cancel_invite",
            });
            return createForbiddenResponse("You don't have permission to cancel invites");
        }

        const { id } = await params;

        if (!id || typeof id !== "string") {
            logWarn("Failed to cancel invite: invalid ID", {
                userId: context.user.id,
                action: "cancel_invite",
            });
            return createValidationErrorResponse("Invalid invite ID");
        }

        logInfo("Cancelling invite", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            inviteId: id,
            action: "cancel_invite",
        });

        // Find the invite
        const invite = await prisma.invite.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!invite) {
            logWarn("Failed to cancel invite: not found", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                inviteId: id,
                action: "cancel_invite",
            });
            return createNotFoundResponse("Invite not found");
        }

        // Check if already accepted
        if (invite.acceptedAt) {
            logWarn("Failed to cancel invite: already accepted", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                inviteId: id,
                action: "cancel_invite",
            });
            return createValidationErrorResponse("Cannot cancel an accepted invite");
        }

        // Delete the invite
        await prisma.invite.delete({
            where: { id },
        });

        logInfo("Successfully cancelled invite", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            inviteId: id,
            action: "cancel_invite",
        });

        return NextResponse.json({
            success: true,
            message: "Invite cancelled",
        });
    } catch (error) {
        logError("Failed to cancel invite", error instanceof Error ? error : new Error(String(error)), {
            action: "cancel_invite",
        });
        return createErrorResponse(error, "Failed to cancel invite", 500, "CANCEL_INVITE_ERROR");
    }
}
