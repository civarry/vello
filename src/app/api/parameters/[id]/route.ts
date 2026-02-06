import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logging";
import { z } from "zod";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

const updateParameterSchema = z.object({
    key: z
        .string()
        .min(1)
        .regex(
            /^[a-zA-Z][a-zA-Z0-9.]*$/,
            "Key must start with a letter and contain only letters, numbers, and dots"
        )
        .optional(),
    label: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    dataType: z.enum(["text", "number", "date"]).optional(),
    isRequired: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

/**
 * PUT /api/parameters/[id]
 * Update an organization parameter. OWNER/ADMIN only.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id } = await params;

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            return createForbiddenResponse(
                "You don't have permission to manage parameters"
            );
        }

        const orgId = context.currentMembership.organization.id;

        const existing = await prisma.organizationParameter.findFirst({
            where: { id, organizationId: orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Parameter not found" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validated = updateParameterSchema.parse(body);

        // If key is being changed, check for duplicates
        if (validated.key && validated.key !== existing.key) {
            const duplicate = await prisma.organizationParameter.findUnique({
                where: {
                    organizationId_key: {
                        organizationId: orgId,
                        key: validated.key,
                    },
                },
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: `A parameter with key "${validated.key}" already exists` },
                    { status: 409 }
                );
            }
        }

        const changes: { field: string; old: string; new: string }[] = [];
        if (validated.label && validated.label !== existing.label) {
            changes.push({ field: "Label", old: existing.label, new: validated.label });
        }
        if (validated.key && validated.key !== existing.key) {
            changes.push({ field: "Key", old: existing.key, new: validated.key });
        }
        if (validated.category && validated.category !== existing.category) {
            changes.push({ field: "Category", old: existing.category, new: validated.category });
        }
        if (validated.dataType && validated.dataType !== existing.dataType) {
            changes.push({ field: "Data Type", old: existing.dataType, new: validated.dataType });
        }
        if (validated.isRequired !== undefined && validated.isRequired !== existing.isRequired) {
            changes.push({ field: "Required", old: String(existing.isRequired), new: String(validated.isRequired) });
        }

        const parameter = await prisma.organizationParameter.update({
            where: { id },
            data: validated,
        });

        logInfo("Updated organization parameter", {
            userId: context.user.id,
            organizationId: orgId,
            parameterId: id,
            action: "update_parameter",
        });

        await logAuditEvent({
            action: "PARAMETER_UPDATED",
            user: createAuditUserContext(context),
            resource: {
                type: "parameter",
                id: parameter.id,
                name: parameter.label,
            },
            metadata: { changes },
        });

        return NextResponse.json({ data: parameter });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0];
            const field = firstError.path.join(".");
            return NextResponse.json(
                { error: `Validation failed: ${field} - ${firstError.message}` },
                { status: 400 }
            );
        }

        logError(
            "Failed to update parameter",
            error instanceof Error ? error : new Error(String(error)),
            { action: "update_parameter" }
        );

        return createErrorResponse(error, "Failed to update parameter", 500);
    }
}

/**
 * DELETE /api/parameters/[id]
 * Delete an organization parameter. OWNER/ADMIN only.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id } = await params;

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            return createForbiddenResponse(
                "You don't have permission to manage parameters"
            );
        }

        const orgId = context.currentMembership.organization.id;

        const existing = await prisma.organizationParameter.findFirst({
            where: { id, organizationId: orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Parameter not found" },
                { status: 404 }
            );
        }

        await prisma.organizationParameter.delete({ where: { id } });

        logInfo("Deleted organization parameter", {
            userId: context.user.id,
            organizationId: orgId,
            parameterId: id,
            action: "delete_parameter",
        });

        await logAuditEvent({
            action: "PARAMETER_DELETED",
            user: createAuditUserContext(context),
            resource: {
                type: "parameter",
                id: existing.id,
                name: existing.label,
            },
            metadata: {
                key: existing.key,
                category: existing.category,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError(
            "Failed to delete parameter",
            error instanceof Error ? error : new Error(String(error)),
            { action: "delete_parameter" }
        );
        return createErrorResponse(error, "Failed to delete parameter", 500);
    }
}
