import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createTemplateSchema } from "@/lib/validations/template";
import { ZodError } from "zod";

// For now, we'll use a hardcoded org ID until auth is implemented
const TEMP_ORG_ID = "temp-org-id";

async function ensureTempOrg() {
  const org = await prisma.organization.findUnique({
    where: { id: TEMP_ORG_ID },
  });

  if (!org) {
    await prisma.organization.create({
      data: {
        id: TEMP_ORG_ID,
        name: "Demo Organization",
        slug: "demo-org",
      },
    });
  }
}

export async function GET() {
  try {
    await ensureTempOrg();

    const templates = await prisma.template.findMany({
      where: { organizationId: TEMP_ORG_ID },
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
    await ensureTempOrg();

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
        organizationId: TEMP_ORG_ID,
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
