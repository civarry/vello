import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { transferOwnershipSchema } from "@/lib/validations/member";

/**
 * POST /api/members/transfer-ownership
 * Transfer organization ownership to another member.
 * Only OWNER can do this. Current OWNER becomes ADMIN.
 */
export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      logWarn("Failed to transfer ownership: unauthorized", {
        action: "transfer_ownership",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    // Only OWNER can transfer ownership
    if (context.currentMembership.role !== "OWNER") {
      logWarn("Failed to transfer ownership: not owner", {
        userId: context.user.id,
        organizationId: context.currentMembership.organization.id,
        role: context.currentMembership.role,
        action: "transfer_ownership",
      });
      return createForbiddenResponse("Only the organization owner can transfer ownership");
    }

    const body = await request.json();
    const validationResult = transferOwnershipSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(
        validationResult.error.issues[0]?.message || "Validation failed",
        validationResult.error.issues
      );
    }

    const { newOwnerId } = validationResult.data;
    const orgId = context.currentMembership.organization.id;

    // Find the new owner (must be a member of this org)
    const newOwnerMember = await prisma.organizationMember.findUnique({
      where: { id: newOwnerId },
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

    if (!newOwnerMember || newOwnerMember.organizationId !== orgId) {
      return createNotFoundResponse("Member not found in this organization");
    }

    // Cannot transfer to self
    if (newOwnerMember.userId === context.user.id) {
      return createValidationErrorResponse("You are already the owner");
    }

    logInfo("Transferring ownership", {
      userId: context.user.id,
      organizationId: orgId,
      newOwnerMemberId: newOwnerId,
      newOwnerEmail: newOwnerMember.user.email,
      action: "transfer_ownership",
    });

    // Perform the transfer in a transaction
    const [updatedCurrentOwner, updatedNewOwner] = await prisma.$transaction([
      // Current owner becomes ADMIN
      prisma.organizationMember.update({
        where: { id: context.currentMembership.id },
        data: { role: "ADMIN" },
      }),
      // New member becomes OWNER
      prisma.organizationMember.update({
        where: { id: newOwnerId },
        data: { role: "OWNER" },
      }),
    ]);

    logInfo("Ownership transferred successfully", {
      userId: context.user.id,
      organizationId: orgId,
      newOwnerMemberId: newOwnerId,
      previousOwnerNewRole: updatedCurrentOwner.role,
      newOwnerRole: updatedNewOwner.role,
      action: "transfer_ownership",
    });

    return NextResponse.json({
      data: {
        success: true,
        newOwner: {
          id: newOwnerMember.id,
          userId: newOwnerMember.user.id,
          name: newOwnerMember.user.name,
          email: newOwnerMember.user.email,
          role: "OWNER",
        },
        previousOwner: {
          id: context.currentMembership.id,
          userId: context.user.id,
          name: context.user.name,
          email: context.user.email,
          role: "ADMIN",
        },
      },
    });
  } catch (error) {
    logError(
      "Failed to transfer ownership",
      error instanceof Error ? error : new Error(String(error)),
      { action: "transfer_ownership" }
    );
    return createErrorResponse(
      error,
      "Failed to transfer ownership",
      500,
      "TRANSFER_OWNERSHIP_ERROR"
    );
  }
}
