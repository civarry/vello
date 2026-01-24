import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createTemplateSchema } from "@/lib/validations/template";
import { ZodError } from "zod";

export async function GET() {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const templates = await prisma.template.findMany({
      where: { organizationId: context.currentMembership.organization.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        paperSize: true,
        orientation: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    const template = await prisma.template.create({
      data: {
        name: validated.name,
        description: validated.description,
        schema: validated.schema as object,
        paperSize: validated.paperSize,
        orientation: validated.orientation,
        isDefault: validated.isDefault ?? false,
        organizationId: context.currentMembership.organization.id,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
