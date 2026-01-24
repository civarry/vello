import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { createErrorResponse, createValidationErrorResponse, createUnauthorizedResponse, createForbiddenResponse, createNotFoundResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";

/**
 * POST /api/invites/accept/[token]
 * Accept an invite and join the organization.
 * Requires authentication.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const supabase = await createClient();

        // Get the authenticated user
        const {
            data: { user: authUser },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
            logWarn("Failed to accept invite: unauthorized", {
                action: "accept_invite",
            });
            return createUnauthorizedResponse("Unauthorized");
        }

        const { token } = await params;

        if (!token || typeof token !== "string") {
            logWarn("Failed to accept invite: invalid token", {
                action: "accept_invite",
            });
            return createValidationErrorResponse("Invalid invite token");
        }

        logInfo("Accepting invite", {
            email: authUser.email,
            action: "accept_invite",
        });

        // Find the invite
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (!invite) {
            logWarn("Failed to accept invite: not found", {
                email: authUser.email,
                action: "accept_invite",
            });
            return createNotFoundResponse("Invite not found");
        }

        // Check if invite has expired
        if (invite.expiresAt < new Date()) {
            logWarn("Failed to accept invite: expired", {
                email: authUser.email,
                inviteId: invite.id,
                action: "accept_invite",
            });
            return createValidationErrorResponse("This invite has expired");
        }

        // Check if invite has already been accepted
        if (invite.acceptedAt) {
            logWarn("Failed to accept invite: already used", {
                email: authUser.email,
                inviteId: invite.id,
                action: "accept_invite",
            });
            return createValidationErrorResponse("This invite has already been used");
        }

        // Check if the invite email matches the authenticated user
        if (invite.email.toLowerCase() !== authUser.email?.toLowerCase()) {
            logWarn("Failed to accept invite: email mismatch", {
                email: authUser.email,
                inviteEmail: invite.email,
                inviteId: invite.id,
                action: "accept_invite",
            });
            return createForbiddenResponse("This invite was sent to a different email address");
        }

        // Accept the invite in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if user exists, create if not
            let dbUser = await tx.user.findUnique({
                where: { authId: authUser.id },
            });

            if (!dbUser) {
                dbUser = await tx.user.create({
                    data: {
                        authId: authUser.id,
                        email: authUser.email!,
                        name: authUser.user_metadata?.full_name || null,
                    },
                });
            }

            // Check if already a member (edge case)
            const existingMembership = await tx.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId: dbUser.id,
                        organizationId: invite.organizationId,
                    },
                },
            });

            if (existingMembership) {
                // Mark invite as accepted but don't create duplicate membership
                await tx.invite.update({
                    where: { id: invite.id },
                    data: { acceptedAt: new Date() },
                });
                return { user: dbUser, membership: existingMembership, alreadyMember: true };
            }

            // Create the membership
            const membership = await tx.organizationMember.create({
                data: {
                    userId: dbUser.id,
                    organizationId: invite.organizationId,
                    role: invite.role,
                },
            });

            // Mark invite as accepted
            await tx.invite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date() },
            });

            // Always switch to the organization they just joined
            await tx.user.update({
                where: { id: dbUser.id },
                data: { currentOrganizationId: invite.organizationId },
            });

            return { user: dbUser, membership, alreadyMember: false };
        });

        logInfo("Successfully accepted invite", {
            userId: result.user.id,
            organizationId: invite.organizationId,
            alreadyMember: result.alreadyMember,
            action: "accept_invite",
        });

        return NextResponse.json({
            success: true,
            organization: invite.organization,
            alreadyMember: result.alreadyMember,
        });
    } catch (error) {
        logError("Failed to accept invite", error instanceof Error ? error : new Error(String(error)), {
            action: "accept_invite",
        });
        return createErrorResponse(error, "Failed to accept invite", 500, "ACCEPT_INVITE_ERROR");
    }
}

/**
 * GET /api/invites/accept/[token]
 * Get invite details (for showing on the accept page).
 * Does NOT require authentication.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        // Find the invite
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                invitedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invite) {
            return createNotFoundResponse("Invite not found");
        }

        // Check if invite has expired
        if (invite.expiresAt < new Date()) {
            return NextResponse.json(
                { error: "This invite has expired", expired: true },
                { status: 400 }
            );
        }

        // Check if invite has already been accepted
        if (invite.acceptedAt) {
            return NextResponse.json(
                { error: "This invite has already been used", used: true },
                { status: 400 }
            );
        }

        // Check if a user with this email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: invite.email },
            select: { id: true },
        });

        return NextResponse.json({
            data: {
                email: invite.email,
                role: invite.role,
                organization: invite.organization,
                invitedBy: invite.invitedBy,
                expiresAt: invite.expiresAt,
                hasAccount: !!existingUser,
            },
        });
    } catch (error) {
        return createErrorResponse(error, "Failed to get invite", 500, "GET_INVITE_ERROR");
    }
}
