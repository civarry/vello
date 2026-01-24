import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await params;

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
            return NextResponse.json(
                { error: "Invite not found" },
                { status: 404 }
            );
        }

        // Check if invite has expired
        if (invite.expiresAt < new Date()) {
            return NextResponse.json(
                { error: "This invite has expired" },
                { status: 400 }
            );
        }

        // Check if invite has already been accepted
        if (invite.acceptedAt) {
            return NextResponse.json(
                { error: "This invite has already been used" },
                { status: 400 }
            );
        }

        // Check if the invite email matches the authenticated user
        if (invite.email.toLowerCase() !== authUser.email?.toLowerCase()) {
            return NextResponse.json(
                { error: "This invite was sent to a different email address" },
                { status: 403 }
            );
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

            // If user doesn't have a current org, set this one
            if (!dbUser.currentOrganizationId) {
                await tx.user.update({
                    where: { id: dbUser.id },
                    data: { currentOrganizationId: invite.organizationId },
                });
            }

            return { user: dbUser, membership, alreadyMember: false };
        });

        return NextResponse.json({
            success: true,
            organization: invite.organization,
            alreadyMember: result.alreadyMember,
        });
    } catch (error) {
        console.error("Failed to accept invite:", error);
        return NextResponse.json(
            { error: "Failed to accept invite" },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: "Invite not found" },
                { status: 404 }
            );
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

        return NextResponse.json({
            data: {
                email: invite.email,
                role: invite.role,
                organization: invite.organization,
                invitedBy: invite.invitedBy,
                expiresAt: invite.expiresAt,
            },
        });
    } catch (error) {
        console.error("Failed to get invite:", error);
        return NextResponse.json(
            { error: "Failed to get invite" },
            { status: 500 }
        );
    }
}
