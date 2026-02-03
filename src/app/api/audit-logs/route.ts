import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
} from "@/lib/errors";
import { logError, logWarn } from "@/lib/logging";

/**
 * GET /api/audit-logs
 * Retrieve audit logs for the current organization.
 * Requires audit:read permission.
 */
export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      logWarn("Failed to fetch audit logs: unauthorized", {
        action: "fetch_audit_logs",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    // Check permission - only OWNER and ADMIN can view audit logs
    if (!hasPermission(context.currentMembership.role, "audit:read")) {
      logWarn("Failed to fetch audit logs: insufficient permissions", {
        userId: context.user.id,
        organizationId: context.currentMembership.organization.id,
        role: context.currentMembership.role,
        action: "fetch_audit_logs",
      });
      return createForbiddenResponse("You don't have permission to view audit logs");
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.currentMembership.organization.id,
    };

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        (where.timestamp as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        (where.timestamp as Record<string, Date>).lt = endDateObj;
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError(
      "Failed to fetch audit logs",
      error instanceof Error ? error : new Error(String(error)),
      { action: "fetch_audit_logs" }
    );
    return createErrorResponse(error, "Failed to fetch audit logs", 500);
  }
}
