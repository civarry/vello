import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV for the current organization.
 * Requires audit:read permission.
 */
export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      logWarn("Failed to export audit logs: unauthorized", {
        action: "export_audit_logs",
      });
      return createUnauthorizedResponse(error || "Unauthorized");
    }

    // Check permission - only OWNER and ADMIN can export audit logs
    if (!hasPermission(context.currentMembership.role, "audit:read")) {
      logWarn("Failed to export audit logs: insufficient permissions", {
        userId: context.user.id,
        organizationId: context.currentMembership.organization.id,
        role: context.currentMembership.role,
        action: "export_audit_logs",
      });
      return createForbiddenResponse("You don't have permission to export audit logs");
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
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
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        (where.timestamp as Record<string, Date>).lt = endDateObj;
      }
    }

    // Get all audit logs (with a reasonable limit for export)
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 10000, // Limit to prevent memory issues
    });

    // Generate CSV content
    const headers = [
      "Timestamp",
      "User Name",
      "User Email",
      "User Role",
      "Action",
      "Description",
      "Resource Type",
      "Resource ID",
      "Resource Name",
      "IP Address",
    ];

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = auditLogs.map((log) => [
      log.timestamp.toISOString(),
      escapeCSV(log.userName),
      escapeCSV(log.userEmail),
      log.userRole,
      log.action,
      escapeCSV(log.actionDescription),
      escapeCSV(log.resourceType),
      escapeCSV(log.resourceId),
      escapeCSV(log.resourceName),
      escapeCSV(log.ipAddress),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    logInfo("Exported audit logs", {
      userId: context.user.id,
      organizationId: context.currentMembership.organization.id,
      recordCount: auditLogs.length,
      action: "export_audit_logs",
    });

    // Return CSV file
    const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(
      "Failed to export audit logs",
      error instanceof Error ? error : new Error(String(error)),
      { action: "export_audit_logs" }
    );
    return createErrorResponse(error, "Failed to export audit logs", 500);
  }
}
