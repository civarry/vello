import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * Gets the current authenticated user with their organization.
 * Use this in API routes to get the user context for multi-tenant queries.
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return { user: null, error: "User not found. Please complete onboarding." };
    }

    return {
      user: {
        id: user.id,
        authId: user.authId,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization,
      },
      error: null,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return { user: null, error: "Authentication failed" };
  }
}
