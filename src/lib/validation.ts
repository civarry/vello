import { z } from "zod";

/**
 * Enhanced email validation schema.
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .trim()
  .max(255, "Email address is too long");

/**
 * Organization ID validation schema.
 */
export const organizationIdSchema = z
  .string()
  .min(1, "Organization ID is required")
  .max(100, "Organization ID is too long");

/**
 * User role validation schema.
 */
export const userRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"], {
  message: "Invalid role",
});

/**
 * Invite role validation schema (only ADMIN and MEMBER can be invited).
 */
export const inviteRoleSchema = z.enum(["ADMIN", "MEMBER"], {
  message: "Invalid role. Only ADMIN and MEMBER can be invited.",
});

/**
 * Validates that an organization ID matches the expected format.
 */
export function isValidOrganizationId(id: string): boolean {
  return organizationIdSchema.safeParse(id).success;
}

/**
 * Validates that an email is in the correct format.
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Sanitizes user input by trimming and limiting length.
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}
