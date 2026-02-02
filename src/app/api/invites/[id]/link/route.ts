import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";

/**
 * GET /api/invites/[id]/link
 * Fetch the invite token for a specific invite by ID.
 * Requires members:invite permission for security.
 * This endpoint exists because the list API intentionally excludes tokens.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to fetch invite link: unauthorized", {
                action: "fetch_invite_link",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "members:invite")) {
            logWarn("Failed to fetch invite link: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "fetch_invite_link",
            });
            return createForbiddenResponse("You don't have permission to access invite links");
        }

        const invite = await prisma.invite.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
                acceptedAt: null, // Only pending invites
            },
            select: {
                id: true,
                token: true,
            },
        });

        if (!invite) {
            logWarn("Invite not found", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                inviteId: id,
                action: "fetch_invite_link",
            });
            return NextResponse.json(
                { error: "Invite not found", code: "INVITE_NOT_FOUND" },
                { status: 404 }
            );
        }

        logInfo("Invite link accessed", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            inviteId: id,
            action: "fetch_invite_link",
        });

        return NextResponse.json({
            data: {
                token: invite.token,
            },
        });
    } catch (error) {
        logError("Failed to fetch invite link", error instanceof Error ? error : new Error(String(error)), {
            action: "fetch_invite_link",
        });
        return createErrorResponse(error, "Failed to fetch invite link", 500, "FETCH_INVITE_LINK_ERROR");
    }
}
