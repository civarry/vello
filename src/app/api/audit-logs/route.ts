import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
} from "@/lib/errors";
import { logError, logWarn } from "@/lib/logging";

// Validation schema for audit log query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().cuid().optional(),
  action: z.string().max(100).optional(),
  resourceType: z.string().max(50).optional(),
  startDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }).optional(),
  endDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }).optional(),
});

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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      userId: searchParams.get("userId") || undefined,
      action: searchParams.get("action") || undefined,
      resourceType: searchParams.get("resourceType") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const parseResult = queryParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { page, limit, userId, action, resourceType, startDate, endDate } = parseResult.data;

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
