import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@/generated/prisma/client";

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
}

export interface MembershipInfo {
  id: string;
  role: UserRole;
  organization: OrganizationInfo;
}

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  name: string | null;
  currentOrganizationId: string | null;
}

export interface AuthContext {
  user: AuthUser;
  currentMembership: MembershipInfo;
  allMemberships: MembershipInfo[];
}

export interface AuthResult {
  context: AuthContext | null;
  error: string | null;
}

import { cache } from "react";

/**
 * Gets the current authenticated user with their organization memberships.
 * Use this in API routes to get the user context for multi-tenant queries.
 * Wrapped in React cache() to deduplicate requests in the same render cycle.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { context: null, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    if (!user) {
      return { context: null, error: "User not found. Please complete onboarding." };
    }

    // User has no memberships - needs onboarding
    if (user.memberships.length === 0) {
      return { context: null, error: "No organization membership. Please complete onboarding." };
    }

    // Map memberships to the expected format
    const allMemberships: MembershipInfo[] = user.memberships.map((m) => ({
      id: m.id,
      role: m.role,
      organization: m.organization,
    }));

    // Determine current membership
    let currentMembership: MembershipInfo | undefined;

    if (user.currentOrganizationId) {
      currentMembership = allMemberships.find(
        (m) => m.organization.id === user.currentOrganizationId
      );
    }

    // Fallback to first membership if currentOrganizationId is not set or invalid
    if (!currentMembership) {
      currentMembership = allMemberships[0];

      // Update user's currentOrganizationId if it was invalid
      if (user.currentOrganizationId !== currentMembership.organization.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { currentOrganizationId: currentMembership.organization.id },
        });
      }
    }

    return {
      context: {
        user: {
          id: user.id,
          authId: user.authId,
          email: user.email,
          name: user.name,
          currentOrganizationId: currentMembership.organization.id,
        },
        currentMembership,
        allMemberships,
      },
      error: null,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return { context: null, error: "Authentication failed" };
  }
});

/**
 * Switches the current organization for a user.
 * Verifies the user has a membership in the target organization.
 */
export async function switchOrganization(
  userId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the user has a membership in this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return { success: false, error: "No membership in this organization" };
    }

    // Update the user's current organization
    await prisma.user.update({
      where: { id: userId },
      data: { currentOrganizationId: organizationId },
    });

    return { success: true };
  } catch (error) {
    console.error("Switch organization error:", error);
    return { success: false, error: "Failed to switch organization" };
  }
}

/**
 * Validates that a user has membership in a specific organization.
 * Returns the membership if valid, null otherwise.
 */
export async function validateOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<{ id: string; role: UserRole; organizationId: string } | null> {
  try {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    return membership;
  } catch (error) {
    console.error("Error validating organization membership:", error);
    return null;
  }
}
