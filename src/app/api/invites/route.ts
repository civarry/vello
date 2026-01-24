import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendInviteEmail } from "@/lib/email";
import { z } from "zod";

const createInviteSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

/**
 * GET /api/invites
 * List all pending invites for the current organization.
 * Requires members:read permission.
 */
export async function GET() {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return NextResponse.json({ error }, { status: 401 });
        }

        if (!hasPermission(context.currentMembership.role, "members:read")) {
            return NextResponse.json(
                { error: "You don't have permission to view invites" },
                { status: 403 }
            );
        }

        const invites = await prisma.invite.findMany({
            where: {
                organizationId: context.currentMembership.organization.id,
                acceptedAt: null, // Only pending invites
            },
            include: {
                invitedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            data: invites.map((invite) => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
                token: invite.token,
                expiresAt: invite.expiresAt,
                createdAt: invite.createdAt,
                invitedBy: invite.invitedBy,
            })),
        });
    } catch (error) {
        console.error("Failed to fetch invites:", error);
        return NextResponse.json(
            { error: "Failed to fetch invites" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/invites
 * Create a new invite.
 * Requires members:invite permission.
 */
export async function POST(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return NextResponse.json({ error }, { status: 401 });
        }

        if (!hasPermission(context.currentMembership.role, "members:invite")) {
            return NextResponse.json(
                { error: "You don't have permission to invite members" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validationResult = createInviteSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: validationResult.error.issues[0]?.message || "Validation failed" },
                { status: 400 }
            );
        }

        const { email, role } = validationResult.data;
        const orgId = context.currentMembership.organization.id;

        // Check if user is already a member
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    where: { organizationId: orgId },
                },
            },
        });

        if (existingUser && existingUser.memberships.length > 0) {
            return NextResponse.json(
                { error: "This user is already a member of this organization" },
                { status: 400 }
            );
        }

        // Check if there's already a pending invite for this email
        const existingInvite = await prisma.invite.findFirst({
            where: {
                email,
                organizationId: orgId,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
        });

        if (existingInvite) {
            return NextResponse.json(
                { error: "An invite for this email is already pending" },
                { status: 400 }
            );
        }

        // Create the invite (expires in 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await prisma.invite.create({
            data: {
                email,
                role,
                expiresAt,
                invitedById: context.user.id,
                organizationId: orgId,
            },
        });

        // Send invite email
        let emailSent = false;
        try {
            if (process.env.RESEND_API_KEY) {
                await sendInviteEmail({
                    to: email,
                    inviterName: context.user.name || context.user.email,
                    organizationName: context.currentMembership.organization.name,
                    role,
                    inviteToken: invite.token,
                });
                emailSent = true;
            }
        } catch (emailError) {
            // Log but don't fail the invite creation if email fails
            console.error("Failed to send invite email:", emailError);
        }

        return NextResponse.json({
            data: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                token: invite.token,
                expiresAt: invite.expiresAt,
                emailSent,
            },
        }, { status: 201 });
    } catch (error) {
        console.error("Failed to create invite:", error);
        return NextResponse.json(
            { error: "Failed to create invite" },
            { status: 500 }
        );
    }
}
