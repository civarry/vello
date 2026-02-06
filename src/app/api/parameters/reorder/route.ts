import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from "@/lib/errors";
import { logError } from "@/lib/logging";
import { z } from "zod";

const reorderSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().min(1),
            sortOrder: z.number().int(),
        })
    ),
});

/**
 * PUT /api/parameters/reorder
 * Batch update sortOrder for organization parameters. OWNER/ADMIN only.
 */
export async function PUT(request: NextRequest) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        if (!hasPermission(context.currentMembership.role, "settings:manage")) {
            return createForbiddenResponse(
                "You don't have permission to manage parameters"
            );
        }

        const body = await request.json();
        const { items } = reorderSchema.parse(body);

        const orgId = context.currentMembership.organization.id;

        await prisma.$transaction(
            items.map((item) =>
                prisma.organizationParameter.updateMany({
                    where: {
                        id: item.id,
                        organizationId: orgId,
                    },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        return NextResponse.json({ success: true });
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
            "Failed to reorder parameters",
            error instanceof Error ? error : new Error(String(error)),
            { action: "reorder_parameters" }
        );

        return createErrorResponse(error, "Failed to reorder parameters", 500);
    }
}
