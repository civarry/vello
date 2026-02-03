import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@/generated/prisma/client";
import { logError } from "@/lib/logging";

/**
 * Audit action types for tracking user activities.
 */
export type AuditAction =
  // Templates
  | "TEMPLATE_CREATED"
  | "TEMPLATE_EDITED"
  | "TEMPLATE_DELETED"
  | "TEMPLATE_DUPLICATED"
  | "TEMPLATE_SET_DEFAULT"
  // Generate
  | "PAYSLIP_GENERATED"
  | "PAYSLIP_BATCH_GENERATED"
  | "EXCEL_IMPORTED"
  // Send
  | "PAYSLIP_SENT"
  | "PAYSLIP_BATCH_SENT"
  // Team
  | "MEMBER_INVITED"
  | "INVITE_REVOKED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED"
  | "OWNERSHIP_TRANSFERRED"
  | "MEMBER_LEFT"
  // Organization
  | "ORG_UPDATED"
  | "ORG_DELETED"
  // Settings
  | "SMTP_CONFIG_ADDED"
  | "SMTP_CONFIG_UPDATED"
  | "SMTP_CONFIG_DELETED";

/**
 * Human-readable descriptions for audit actions.
 */
const ACTION_DESCRIPTIONS: Record<AuditAction, string> = {
  TEMPLATE_CREATED: "Created a template",
  TEMPLATE_EDITED: "Edited a template",
  TEMPLATE_DELETED: "Deleted a template",
  TEMPLATE_DUPLICATED: "Duplicated a template",
  TEMPLATE_SET_DEFAULT: "Set a template as default",
  PAYSLIP_GENERATED: "Generated a payslip",
  PAYSLIP_BATCH_GENERATED: "Generated batch payslips",
  EXCEL_IMPORTED: "Imported data from Excel",
  PAYSLIP_SENT: "Sent a payslip via email",
  PAYSLIP_BATCH_SENT: "Sent batch payslips via email",
  MEMBER_INVITED: "Invited a member",
  INVITE_REVOKED: "Revoked an invite",
  MEMBER_REMOVED: "Removed a member",
  MEMBER_ROLE_CHANGED: "Changed a member's role",
  OWNERSHIP_TRANSFERRED: "Transferred ownership",
  MEMBER_LEFT: "Left the organization",
  ORG_UPDATED: "Updated organization settings",
  ORG_DELETED: "Deleted the organization",
  SMTP_CONFIG_ADDED: "Added email configuration",
  SMTP_CONFIG_UPDATED: "Updated email configuration",
  SMTP_CONFIG_DELETED: "Deleted email configuration",
};

/**
 * User context for audit logging.
 */
export interface AuditUserContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  organizationId: string;
}

/**
 * Resource information for audit logging.
 */
export interface AuditResource {
  type: string;
  id: string;
  name?: string;
}

/**
 * Options for logging an audit event.
 */
export interface LogAuditEventOptions {
  action: AuditAction;
  user: AuditUserContext;
  resource?: AuditResource;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Logs an audit event to the database.
 * This function is designed to never throw - errors are logged but not propagated.
 */
export async function logAuditEvent(options: LogAuditEventOptions): Promise<void> {
  const { action, user, resource, metadata, ipAddress } = options;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        actionDescription: ACTION_DESCRIPTIONS[action] || action,
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        userRole: user.userRole,
        organizationId: user.organizationId,
        resourceType: resource?.type,
        resourceId: resource?.id,
        resourceName: resource?.name,
        metadata: metadata ? (metadata as object) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    // Log the error but don't throw - audit logging should not break the main flow
    logError(
      "Failed to log audit event",
      error instanceof Error ? error : new Error(String(error)),
      {
        action,
        userId: user.userId,
        organizationId: user.organizationId,
      }
    );
  }
}

/**
 * Creates an audit user context from the current user context.
 */
export function createAuditUserContext(context: {
  user: { id: string; email: string; name: string | null };
  currentMembership: {
    role: UserRole;
    organization: { id: string };
  };
}): AuditUserContext {
  return {
    userId: context.user.id,
    userName: context.user.name || context.user.email.split("@")[0],
    userEmail: context.user.email,
    userRole: context.currentMembership.role,
    organizationId: context.currentMembership.organization.id,
  };
}
