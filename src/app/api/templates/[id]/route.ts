import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { updateTemplateSchema } from "@/lib/validations/template";
import { ZodError } from "zod";

const TEMP_ORG_ID = "temp-org-id";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.template.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);

    // Check if template exists
    const existing = await prisma.template.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.schema && { schema: validated.schema as object }),
        ...(validated.paperSize && { paperSize: validated.paperSize }),
        ...(validated.orientation && { orientation: validated.orientation }),
        ...(validated.isDefault !== undefined && { isDefault: validated.isDefault }),
      },
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists
    const existing = await prisma.template.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
