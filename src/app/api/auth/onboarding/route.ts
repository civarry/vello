import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const onboardingSchema = z.object({
    orgName: z.string().min(1, "Organization name is required").max(100),
    address: z.string().max(500).optional(),
});

/**
 * POST /api/auth/onboarding
 * Creates a new organization and links the current user to it via OrganizationMember.
 * If the user doesn't exist, creates them first.
 */
export async function POST(request: Request) {
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

        // Parse and validate input
        const body = await request.json();
        const validationResult = onboardingSchema.safeParse(body);

        if (!validationResult.success) {
            const firstIssue = validationResult.error.issues[0];
            return NextResponse.json(
                { error: firstIssue?.message || "Validation failed" },
                { status: 400 }
            );
        }

        const { orgName, address } = validationResult.data;

        // Generate a unique slug from the org name
        const baseSlug = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        let slug = baseSlug;
        let slugCounter = 1;

        // Check for slug uniqueness and append number if needed
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${slugCounter}`;
            slugCounter++;
        }

        // Create organization, user (if needed), and membership in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if user already exists
            let dbUser = await tx.user.findUnique({
                where: { authId: user.id },
            });

            // Create user if they don't exist
            if (!dbUser) {
                dbUser = await tx.user.create({
                    data: {
                        authId: user.id,
                        email: user.email!,
                        name: user.user_metadata?.full_name || null,
                    },
                });
            }

            // Create the organization
            const organization = await tx.organization.create({
                data: {
                    name: orgName,
                    slug,
                    address: address || null,
                },
            });

            // Create the membership with OWNER role
            await tx.organizationMember.create({
                data: {
                    userId: dbUser.id,
                    organizationId: organization.id,
                    role: "OWNER",
                },
            });

            // Set the current organization for the user
            await tx.user.update({
                where: { id: dbUser.id },
                data: { currentOrganizationId: organization.id },
            });

            return { organization, user: dbUser };
        });

        return NextResponse.json({
            success: true,
            organization: {
                id: result.organization.id,
                name: result.organization.name,
                slug: result.organization.slug,
            },
        });
    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
        );
    }
}
