import { z } from "zod";

/**
 * Schema for changing a member's role.
 * Only ADMIN and MEMBER are valid target roles (cannot change to/from OWNER via this endpoint).
 */
export const changeRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], {
    message: "Role must be either ADMIN or MEMBER",
  }),
});

/**
 * Schema for transferring ownership.
 * Requires the new owner's member ID.
 */
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, "New owner member ID is required"),
});

/**
 * Type for a member in the list response.
 */
export interface MemberListItem {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: Date;
  isCurrentUser: boolean;
}

/**
 * Type for the leave organization response.
 */
export interface LeaveOrganizationResponse {
  success: boolean;
  redirectTo: string;
  newOrganization?: {
    id: string;
    name: string;
  };
}
