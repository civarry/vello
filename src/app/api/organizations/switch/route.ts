import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, switchOrganization } from "@/lib/auth";
import { z } from "zod";

const switchOrgSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
});

/**
 * POST /api/organizations/switch
 * Switches the current user's active organization.
 */
export async function POST(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const body = await request.json();
        const validationResult = switchOrgSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: validationResult.error.issues[0]?.message || "Validation failed" },
                { status: 400 }
            );
        }

        const { organizationId } = validationResult.data;

        // Check if trying to switch to current org (no-op)
        if (organizationId === context.currentMembership.organization.id) {
            return NextResponse.json({
                success: true,
                message: "Already in this organization",
            });
        }

        // Check if user has membership in target org
        const targetMembership = context.allMemberships.find(
            (m) => m.organization.id === organizationId
        );

        if (!targetMembership) {
            return NextResponse.json(
                { error: "You are not a member of this organization" },
                { status: 403 }
            );
        }

        // Perform the switch
        const result = await switchOrganization(context.user.id, organizationId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            organization: targetMembership.organization,
        });
    } catch (error) {
        console.error("Switch organization error:", error);
        return NextResponse.json(
            { error: "Failed to switch organization" },
            { status: 500 }
        );
    }
}
