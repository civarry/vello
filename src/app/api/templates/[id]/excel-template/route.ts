import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateExcelTemplate } from "@/lib/excel/generator";
import { extractUsedVariables } from "@/lib/template-utils";
import { TemplateSchema } from "@/types/template";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const { id } = await params;

        const template = await prisma.template.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        const schema = template.schema as unknown as TemplateSchema;
        const variables = extractUsedVariables(schema.blocks);

        // Generate Excel buffer
        const buffer = generateExcelTemplate(variables);

        // Create response with headers for file download
        const filename = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.xlsx`;

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error("Error generating Excel template:", error);
        return NextResponse.json(
            { error: "Failed to generate Excel template" },
            { status: 500 }
        );
    }
}
