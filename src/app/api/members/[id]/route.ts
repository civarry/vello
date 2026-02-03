import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, canRemoveMember } from "@/lib/permissions";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { changeRoleSchema } from "@/lib/validations/member";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/members/[id]
 * Remove a member from the organization.
 * OWNER can remove anyone (except self), ADMIN can remove MEMBERs only.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params;
    const { context: authContext, error } = await getCurrentUser();

    if (!authContext) {
      logWarn("Failed to remove member: unauthorized", {
        action: "remove_member",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    const orgId = authContext.currentMembership.organization.id;

    // Find the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return createNotFoundResponse("Member not found");
    }

    const isSelf = targetMember.userId === authContext.user.id;

    // Check if trying to remove self - should use /leave endpoint instead
    if (isSelf) {
      logWarn("Failed to remove member: cannot remove self via this endpoint", {
        userId: authContext.user.id,
        organizationId: orgId,
        action: "remove_member",
      });
      return createValidationErrorResponse(
        "Cannot remove yourself. Use the leave organization option instead."
      );
    }

    // Check permission to remove this member
    if (!canRemoveMember(authContext.currentMembership.role, targetMember.role, false)) {
      logWarn("Failed to remove member: insufficient permissions", {
        userId: authContext.user.id,
        organizationId: orgId,
        removerRole: authContext.currentMembership.role,
        targetRole: targetMember.role,
        action: "remove_member",
      });
      return createForbiddenResponse(
        "You don't have permission to remove this member"
      );
    }

    // Check if this is the last member
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: orgId },
    });

    if (memberCount <= 1) {
      return createValidationErrorResponse(
        "Cannot remove the last member of the organization"
      );
    }

    logInfo("Removing member", {
      userId: authContext.user.id,
      organizationId: orgId,
      targetMemberId: memberId,
      targetEmail: targetMember.user.email,
      action: "remove_member",
    });

    // Remove the member
    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    // If the removed user's currentOrganizationId was this org, clear it
    const removedUser = await prisma.user.findUnique({
      where: { id: targetMember.userId },
      select: { currentOrganizationId: true },
    });

    if (removedUser?.currentOrganizationId === orgId) {
      // Find another org they belong to, or set to null
      const otherMembership = await prisma.organizationMember.findFirst({
        where: { userId: targetMember.userId },
        select: { organizationId: true },
      });

      await prisma.user.update({
        where: { id: targetMember.userId },
        data: {
          currentOrganizationId: otherMembership?.organizationId || null,
        },
      });
    }

    logInfo("Member removed successfully", {
      userId: authContext.user.id,
      organizationId: orgId,
      targetMemberId: memberId,
      action: "remove_member",
    });

    // Log audit event
    await logAuditEvent({
      action: "MEMBER_REMOVED",
      user: createAuditUserContext(authContext),
      resource: {
        type: "member",
        id: targetMember.userId,
        name: targetMember.user.name || targetMember.user.email,
      },
      metadata: {
        removedEmail: targetMember.user.email,
        removedRole: targetMember.role,
      },
    });

    return NextResponse.json({
      data: { success: true },
    });
  } catch (error) {
    logError(
      "Failed to remove member",
      error instanceof Error ? error : new Error(String(error)),
      { action: "remove_member" }
    );
    return createErrorResponse(error, "Failed to remove member", 500, "REMOVE_MEMBER_ERROR");
  }
}

/**
 * PATCH /api/members/[id]
 * Change a member's role.
 * Only OWNER can change roles, and cannot change to/from OWNER role.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params;
    const { context: authContext, error } = await getCurrentUser();

    if (!authContext) {
      logWarn("Failed to change role: unauthorized", {
        action: "change_role",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    // Only OWNER can change roles
    if (!hasPermission(authContext.currentMembership.role, "members:update-role")) {
      logWarn("Failed to change role: insufficient permissions", {
        userId: authContext.user.id,
        organizationId: authContext.currentMembership.organization.id,
        role: authContext.currentMembership.role,
        action: "change_role",
      });
      return createForbiddenResponse("Only the organization owner can change member roles");
    }

    const body = await request.json();
    const validationResult = changeRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(
        validationResult.error.issues[0]?.message || "Validation failed",
        validationResult.error.issues
      );
    }

    const { role: newRole } = validationResult.data;
    const orgId = authContext.currentMembership.organization.id;

    // Find the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return createNotFoundResponse("Member not found");
    }

    // Cannot change own role
    if (targetMember.userId === authContext.user.id) {
      return createValidationErrorResponse("Cannot change your own role");
    }

    // Cannot change OWNER role (must use transfer ownership)
    if (targetMember.role === "OWNER") {
      return createValidationErrorResponse(
        "Cannot change the owner's role. Use transfer ownership instead."
      );
    }

    // Check if trying to set to same role
    if (targetMember.role === newRole) {
      return createValidationErrorResponse(
        `Member already has the ${newRole} role`
      );
    }

    logInfo("Changing member role", {
      userId: authContext.user.id,
      organizationId: orgId,
      targetMemberId: memberId,
      targetEmail: targetMember.user.email,
      oldRole: targetMember.role,
      newRole,
      action: "change_role",
    });

    // Update the role
    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logInfo("Member role changed successfully", {
      userId: authContext.user.id,
      organizationId: orgId,
      targetMemberId: memberId,
      newRole,
      action: "change_role",
    });

    // Log audit event
    await logAuditEvent({
      action: "MEMBER_ROLE_CHANGED",
      user: createAuditUserContext(authContext),
      resource: {
        type: "member",
        id: targetMember.userId,
        name: updatedMember.user.name || updatedMember.user.email,
      },
      metadata: {
        memberEmail: updatedMember.user.email,
        previousRole: targetMember.role,
        newRole,
      },
    });

    return NextResponse.json({
      data: {
        id: updatedMember.id,
        userId: updatedMember.user.id,
        name: updatedMember.user.name,
        email: updatedMember.user.email,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt,
      },
    });
  } catch (error) {
    logError(
      "Failed to change member role",
      error instanceof Error ? error : new Error(String(error)),
      { action: "change_role" }
    );
    return createErrorResponse(error, "Failed to change member role", 500, "CHANGE_ROLE_ERROR");
  }
}
