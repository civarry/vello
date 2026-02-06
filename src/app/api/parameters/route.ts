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

const createParameterSchema = z.object({
    key: z
        .string()
        .min(1, "Key is required")
        .regex(
            /^[a-zA-Z][a-zA-Z0-9.]*$/,
            "Key must start with a letter and contain only letters, numbers, and dots"
        ),
    label: z.string().min(1, "Label is required"),
    category: z.string().min(1, "Category is required"),
    dataType: z.enum(["text", "number", "date"]).default("text"),
    isRequired: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
});

/**
 * GET /api/parameters
 * List all organization parameters. Any authenticated org member can read.
 */
export async function GET() {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        const parameters = await prisma.organizationParameter.findMany({
            where: {
                organizationId: context.currentMembership.organization.id,
            },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        });

        return NextResponse.json({ data: parameters });
    } catch (error) {
        logError(
            "Failed to fetch parameters",
            error instanceof Error ? error : new Error(String(error)),
            { action: "get_parameters" }
        );
        return createErrorResponse(error, "Failed to fetch parameters", 500);
    }
}

/**
 * POST /api/parameters
 * Create a new organization parameter. OWNER/ADMIN only.
 */
export async function POST(request: NextRequest) {
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
        const validated = createParameterSchema.parse(body);

        const orgId = context.currentMembership.organization.id;

        // Check for duplicate key within the org
        const existing = await prisma.organizationParameter.findUnique({
            where: {
                organizationId_key: {
                    organizationId: orgId,
                    key: validated.key,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: `A parameter with key "${validated.key}" already exists` },
                { status: 409 }
            );
        }

        const parameter = await prisma.organizationParameter.create({
            data: {
                ...validated,
                organizationId: orgId,
            },
        });

        logInfo("Created organization parameter", {
            userId: context.user.id,
            organizationId: orgId,
            parameterId: parameter.id,
            action: "create_parameter",
        });

        await logAuditEvent({
            action: "PARAMETER_CREATED",
            user: createAuditUserContext(context),
            resource: {
                type: "parameter",
                id: parameter.id,
                name: parameter.label,
            },
            metadata: {
                key: parameter.key,
                category: parameter.category,
                dataType: parameter.dataType,
            },
        });

        return NextResponse.json({ data: parameter }, { status: 201 });
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
            "Failed to create parameter",
            error instanceof Error ? error : new Error(String(error)),
            { action: "create_parameter" }
        );

        return createErrorResponse(error, "Failed to create parameter", 500);
    }
}
