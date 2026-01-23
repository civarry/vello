import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/check-org
 * Checks if the current authenticated user has an organization.
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

        // Check if user exists in our database (meaning they have an org)
        const existingUser = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { organizationId: true },
        });

        return NextResponse.json({
            hasOrg: !!existingUser,
            organizationId: existingUser?.organizationId || null,
        });
    } catch (error) {
        console.error("Check org error:", error);
        return NextResponse.json(
            { error: "Failed to check organization" },
            { status: 500 }
        );
    }
}
