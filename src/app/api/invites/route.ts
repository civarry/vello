import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendInviteEmail } from "@/lib/email";
import { z } from "zod";
import { inviteRoleSchema, emailSchema } from "@/lib/validation";
import { createErrorResponse, createValidationErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/errors";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

const createInviteSchema = z.object({
    email: emailSchema,
    role: inviteRoleSchema.default("MEMBER"),
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
            logWarn("Failed to fetch invites: unauthorized", {
                action: "fetch_invites",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "members:read")) {
            logWarn("Failed to fetch invites: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "fetch_invites",
            });
            return createForbiddenResponse("You don't have permission to view invites");
        }

        logInfo("Fetching invites", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            action: "fetch_invites",
        });

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

        logInfo("Successfully fetched invites", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            count: invites.length,
            action: "fetch_invites",
        });

        // Security: Do NOT expose invite tokens in list response
        // Tokens are only returned when creating a new invite
        return NextResponse.json({
            data: invites.map((invite) => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
                expiresAt: invite.expiresAt,
                createdAt: invite.createdAt,
                invitedBy: invite.invitedBy,
            })),
        });
    } catch (error) {
        logError("Failed to fetch invites", error instanceof Error ? error : new Error(String(error)), {
            action: "fetch_invites",
        });
        return createErrorResponse(error, "Failed to fetch invites", 500, "FETCH_INVITES_ERROR");
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
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "members:invite")) {
            logWarn("Failed to create invite: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "create_invite",
            });
            return createForbiddenResponse("You don't have permission to invite members");
        }

        // Rate limiting: 10 invites per hour per user
        const rateLimitResult = checkRateLimit(
            context.user.id,
            10,
            60 * 60 * 1000 // 1 hour
        );

        if (rateLimitResult.limited) {
            logWarn("Rate limit exceeded for invite creation", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                action: "create_invite",
            });
            const headers = getRateLimitHeaders(
                rateLimitResult.remaining,
                rateLimitResult.resetAt
            );
            return NextResponse.json(
                {
                    error: "Too many invite requests. Please try again later.",
                    code: "RATE_LIMIT_EXCEEDED",
                },
                { status: 429, headers }
            );
        }

        const body = await request.json();
        const validationResult = createInviteSchema.safeParse(body);

        if (!validationResult.success) {
            return createValidationErrorResponse(
                validationResult.error.issues[0]?.message || "Validation failed",
                validationResult.error.issues
            );
        }

        const { email, role } = validationResult.data;
        const orgId = context.currentMembership.organization.id;

        logInfo("Creating invite", {
            userId: context.user.id,
            organizationId: orgId,
            email,
            role,
            action: "create_invite",
        });

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
            logWarn("Invite creation failed: user already a member", {
                userId: context.user.id,
                organizationId: orgId,
                email,
                action: "create_invite",
            });
            return createValidationErrorResponse(
                "This user is already a member of this organization"
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
            logWarn("Invite creation failed: pending invite exists", {
                userId: context.user.id,
                organizationId: orgId,
                email,
                action: "create_invite",
            });
            return createValidationErrorResponse(
                "An invite for this email is already pending"
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

        // Send invite email using SMTP if configured
        let emailSent = false;
        let smtpConfigured = false;
        try {
            // Fetch default SMTP config for this organization
            const smtpConfig = await prisma.sMTPConfiguration.findFirst({
                where: {
                    organizationId: orgId,
                    isDefault: true,
                },
                include: {
                    provider: true,
                },
            });

            if (smtpConfig) {
                smtpConfigured = true;
                const result = await sendInviteEmail({
                    to: email,
                    inviterName: context.user.name || context.user.email,
                    organizationName: context.currentMembership.organization.name,
                    role,
                    inviteToken: invite.token,
                    smtpConfig: {
                        smtpServer: smtpConfig.provider.smtpServer,
                        smtpPort: smtpConfig.provider.smtpPort,
                        useTLS: smtpConfig.provider.useTLS,
                        senderEmail: smtpConfig.senderEmail,
                        senderName: smtpConfig.senderName,
                        smtpUsername: smtpConfig.smtpUsername,
                        smtpPassword: smtpConfig.smtpPassword,
                    },
                });
                emailSent = result.success;
                if (!result.success) {
                    console.error("SMTP email send result:", result.message);
                }
            }
        } catch (emailError) {
            // Log but don't fail the invite creation if email fails
            console.error("Failed to send invite email:", emailError);
        }

        logInfo("Invite created successfully", {
            userId: context.user.id,
            organizationId: orgId,
            inviteId: invite.id,
            email,
            emailSent,
            smtpConfigured,
            action: "create_invite",
        });

        // Log audit event
        await logAuditEvent({
            action: "MEMBER_INVITED",
            user: createAuditUserContext(context),
            resource: {
                type: "invite",
                id: invite.id,
                name: email,
            },
            metadata: {
                invitedEmail: email,
                invitedRole: role,
                emailSent,
            },
        });

        const headers = getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetAt
        );

        return NextResponse.json(
            {
                data: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    token: invite.token,
                    expiresAt: invite.expiresAt,
                    emailSent,
                    smtpConfigured,
                },
            },
            { status: 201, headers }
        );
    } catch (error) {
        logError("Failed to create invite", error instanceof Error ? error : new Error(String(error)), {
            action: "create_invite",
        });
        return createErrorResponse(error, "Failed to create invite", 500, "CREATE_INVITE_ERROR");
    }
}
