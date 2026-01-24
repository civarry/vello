import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { LeaveOrganizationResponse } from "@/lib/validations/member";

/**
 * POST /api/members/leave
 * Leave the current organization.
 * OWNER cannot leave - must transfer ownership first.
 */
export async function POST() {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      logWarn("Failed to leave organization: unauthorized", {
        action: "leave_organization",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    const orgId = context.currentMembership.organization.id;
    const userId = context.user.id;

    // OWNER cannot leave - must transfer ownership first
    if (context.currentMembership.role === "OWNER") {
      logWarn("Failed to leave organization: owner cannot leave", {
        userId,
        organizationId: orgId,
        action: "leave_organization",
      });
      return createValidationErrorResponse(
        "As the owner, you must transfer ownership before leaving the organization"
      );
    }

    // Check if this is the last member
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: orgId },
    });

    if (memberCount <= 1) {
      return createValidationErrorResponse(
        "Cannot leave - you are the only member of this organization"
      );
    }

    logInfo("User leaving organization", {
      userId,
      organizationId: orgId,
      role: context.currentMembership.role,
      action: "leave_organization",
    });

    // Delete the membership
    await prisma.organizationMember.delete({
      where: { id: context.currentMembership.id },
    });

    // Find another organization for the user, if any
    const otherMembership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update the user's currentOrganizationId
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentOrganizationId: otherMembership?.organizationId || null,
      },
    });

    logInfo("User left organization successfully", {
      userId,
      organizationId: orgId,
      newOrganizationId: otherMembership?.organizationId || null,
      action: "leave_organization",
    });

    const response: LeaveOrganizationResponse = {
      success: true,
      redirectTo: otherMembership ? "/templates" : "/onboarding",
      ...(otherMembership && {
        newOrganization: {
          id: otherMembership.organization.id,
          name: otherMembership.organization.name,
        },
      }),
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    logError(
      "Failed to leave organization",
      error instanceof Error ? error : new Error(String(error)),
      { action: "leave_organization" }
    );
    return createErrorResponse(
      error,
      "Failed to leave organization",
      500,
      "LEAVE_ORGANIZATION_ERROR"
    );
  }
}
