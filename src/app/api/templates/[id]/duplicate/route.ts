import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;
    const orgId = context.currentMembership.organization.id;

    // Fetch the existing template (must belong to user's org)
    const existing = await prisma.template.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create a duplicate with "(Copy)" suffix
    const duplicate = await prisma.template.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        schema: existing.schema as object,
        paperSize: existing.paperSize,
        orientation: existing.orientation,
        isDefault: false, // Duplicates should not be default
        organizationId: orgId,
      },
    });

    return NextResponse.json({ data: duplicate }, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate template:", error);
    return NextResponse.json(
      { error: "Failed to duplicate template" },
      { status: 500 }
    );
  }
}
