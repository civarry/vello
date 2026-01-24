import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/check-org
 * Checks if the current authenticated user has any organization memberships.
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Get the authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user exists in our database and has memberships
        const existingUser = await prisma.user.findUnique({
            where: { authId: user.id },
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
                },
            },
        });

        const hasMemberships = existingUser && existingUser.memberships.length > 0;

        return NextResponse.json({
            hasOrg: hasMemberships,
            organizationId: existingUser?.currentOrganizationId || null,
            memberships: existingUser?.memberships.map((m) => ({
                id: m.id,
                role: m.role,
                organization: m.organization,
            })) || [],
        });
    } catch (error) {
        console.error("Check org error:", error);
        return NextResponse.json(
            { error: "Failed to check organization" },
            { status: 500 }
        );
    }
}
