import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
    createValidationErrorResponse,
} from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

const updateOrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(100, "Name must be 100 characters or less").optional(),
});

/**
 * GET /api/organization
 * Get current organization details
 */
export async function GET() {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to get organization: unauthorized", {
                action: "get_organization",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        const organization = await prisma.organization.findUnique({
            where: { id: context.currentMembership.organization.id },
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!organization) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        logInfo("Retrieved organization details", {
            userId: context.user.id,
            organizationId: organization.id,
            action: "get_organization",
        });

        return NextResponse.json({ data: organization });
    } catch (error) {
        logError(
            "Failed to get organization",
            error instanceof Error ? error : new Error(String(error)),
            { action: "get_organization" }
        );
        return createErrorResponse(error, "Failed to get organization", 500);
    }
}

/**
 * PUT /api/organization
 * Update organization settings
 * Requires settings:manage permission
 */
export async function PUT(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            logWarn("Failed to update organization: unauthorized", {
                action: "update_organization",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Only OWNER and ADMIN can manage organization settings
        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            logWarn("Failed to update organization: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "update_organization",
            });
            return createForbiddenResponse("You don't have permission to update organization settings");
        }

        const body = await request.json();
        const validationResult = updateOrganizationSchema.safeParse(body);

        if (!validationResult.success) {
            return createValidationErrorResponse(
                validationResult.error.issues[0]?.message || "Validation failed",
                validationResult.error.issues
            );
        }

        const { name } = validationResult.data;

        // Fetch existing organization to compare
        const existingOrg = await prisma.organization.findUnique({
            where: { id: context.currentMembership.organization.id },
        });

        if (!existingOrg) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Build update data
        const updateData: { name?: string } = {};
        if (name !== undefined) {
            updateData.name = name;
        }

        if (Object.keys(updateData).length === 0) {
            return createValidationErrorResponse("No fields to update");
        }

        // Calculate changes for audit log
        const changes: { field: string; old: any; new: any }[] = [];
        if (name && name !== existingOrg.name) {
            changes.push({ field: "Name", old: existingOrg.name, new: name });
        }

        const organization = await prisma.organization.update({
            where: { id: context.currentMembership.organization.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        logInfo("Updated organization", {
            userId: context.user.id,
            organizationId: organization.id,
            updatedFields: Object.keys(updateData),
            action: "update_organization",
        });

        // Log audit event
        await logAuditEvent({
            action: "ORG_UPDATED",
            user: createAuditUserContext(context),
            resource: {
                type: "organization",
                id: organization.id,
                name: organization.name,
            },
            metadata: {
                changes,
            },
        });

        return NextResponse.json({ data: organization });
    } catch (error) {
        logError(
            "Failed to update organization",
            error instanceof Error ? error : new Error(String(error)),
            { action: "update_organization" }
        );
        return createErrorResponse(error, "Failed to update organization", 500);
    }
}
