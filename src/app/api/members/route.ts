import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { MemberListItem } from "@/lib/validations/member";

/**
 * GET /api/members
 * List all members of the current organization.
 * Requires members:read permission (all roles have this).
 */
export async function GET() {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      logWarn("Failed to fetch members: unauthorized", {
        action: "fetch_members",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    if (!hasPermission(context.currentMembership.role, "members:read")) {
      logWarn("Failed to fetch members: insufficient permissions", {
        userId: context.user.id,
        organizationId: context.currentMembership.organization.id,
        role: context.currentMembership.role,
        action: "fetch_members",
      });
      return createForbiddenResponse("You don't have permission to view members");
    }

    const orgId = context.currentMembership.organization.id;

    logInfo("Fetching members", {
      userId: context.user.id,
      organizationId: orgId,
      action: "fetch_members",
    });

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        // OWNER first, then ADMIN, then MEMBER
        { role: "asc" },
        { joinedAt: "asc" },
      ],
    });

    const memberList: MemberListItem[] = members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
      isCurrentUser: member.user.id === context.user.id,
    }));

    logInfo("Successfully fetched members", {
      userId: context.user.id,
      organizationId: orgId,
      count: memberList.length,
      action: "fetch_members",
    });

    return NextResponse.json({
      data: memberList,
    });
  } catch (error) {
    logError(
      "Failed to fetch members",
      error instanceof Error ? error : new Error(String(error)),
      { action: "fetch_members" }
    );
    return createErrorResponse(error, "Failed to fetch members", 500, "FETCH_MEMBERS_ERROR");
  }
}
