import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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
            return NextResponse.json({ error }, { status: 401 });
        }

        if (!hasPermission(context.currentMembership.role, "members:invite")) {
            return NextResponse.json(
                { error: "You don't have permission to cancel invites" },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Find the invite
        const invite = await prisma.invite.findFirst({
            where: {
                id,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!invite) {
            return NextResponse.json(
                { error: "Invite not found" },
                { status: 404 }
            );
        }

        // Check if already accepted
        if (invite.acceptedAt) {
            return NextResponse.json(
                { error: "Cannot cancel an accepted invite" },
                { status: 400 }
            );
        }

        // Delete the invite
        await prisma.invite.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Invite cancelled",
        });
    } catch (error) {
        console.error("Failed to cancel invite:", error);
        return NextResponse.json(
            { error: "Failed to cancel invite" },
            { status: 500 }
        );
    }
}
