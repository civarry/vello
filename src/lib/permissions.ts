import { UserRole } from "@/generated/prisma/client";

/**
 * Permission definitions for the application.
 *
 * OWNER: All permissions
 * ADMIN: Most permissions except removing other admins/owner
 * MEMBER: Basic read/write permissions
 */

export type Permission =
  // Template permissions
  | "templates:read"
  | "templates:write"
  | "templates:delete"
  // Member permissions
  | "members:read"
  | "members:invite"
  | "members:remove"
  | "members:update-role"
  // Organization permissions
  | "org:read"
  | "org:update"
  | "org:delete"
  // Settings permissions
  | "settings:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "templates:read",
    "templates:write",
    "templates:delete",
    "members:read",
    "members:invite",
    "members:remove",
    "members:update-role",
    "org:read",
    "org:update",
    "org:delete",
    "settings:manage",
  ],
  ADMIN: [
    "templates:read",
    "templates:write",
    "templates:delete",
    "members:read",
    "members:invite",
    "org:read",
    "org:update",
    "settings:manage",
  ],
  MEMBER: [
    "templates:read",
    "templates:write",
    "members:read",
    "org:read",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role can manage another role (for role changes)
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    OWNER: 3,
    ADMIN: 2,
    MEMBER: 1,
  };

  // Only OWNER can manage ADMINs, and only OWNER/ADMIN can manage MEMBERs
  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}

/**
 * Check if a user can remove another member from the organization
 */
export function canRemoveMember(
  removerRole: UserRole,
  targetRole: UserRole,
  isSelf: boolean
): boolean {
  // Users can always leave (remove themselves), except OWNER
  if (isSelf && removerRole !== "OWNER") {
    return true;
  }

  // OWNER can remove anyone except themselves
  if (removerRole === "OWNER" && !isSelf) {
    return true;
  }

  // ADMIN can only remove MEMBERs (not other ADMINs or OWNER)
  if (removerRole === "ADMIN" && targetRole === "MEMBER") {
    return true;
  }

  return false;
}
