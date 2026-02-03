import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

async function generateUniqueCopyName(baseName: string, orgId: string): Promise<string> {
  // Find all templates that match the pattern "baseName (Copy)" or "baseName (Copy N)"
  const existingTemplates = await prisma.template.findMany({
    where: {
      organizationId: orgId,
      name: {
        startsWith: baseName,
      },
    },
    select: { name: true },
  });

  const existingNames = new Set(existingTemplates.map((t) => t.name));

  // Try "Name (Copy)" first
  const simpleCopyName = `${baseName} (Copy)`;
  if (!existingNames.has(simpleCopyName)) {
    return simpleCopyName;
  }

  // Find the next available number
  let copyNumber = 2;
  while (existingNames.has(`${baseName} (Copy ${copyNumber})`)) {
    copyNumber++;
  }

  return `${baseName} (Copy ${copyNumber})`;
}

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

    // Generate a unique name for the duplicate
    const baseName = existing.name.replace(/\s*\(Copy(?:\s+\d+)?\)$/, "");
    const copyName = await generateUniqueCopyName(baseName, orgId);

    // Create a duplicate with unique name
    const duplicate = await prisma.template.create({
      data: {
        name: copyName,
        description: existing.description,
        schema: existing.schema as object,
        paperSize: existing.paperSize,
        orientation: existing.orientation,
        isDefault: false, // Duplicates should not be default
        organizationId: orgId,
      },
    });

    // Log audit event
    await logAuditEvent({
      action: "TEMPLATE_DUPLICATED",
      user: createAuditUserContext(context),
      resource: {
        type: "template",
        id: duplicate.id,
        name: duplicate.name,
      },
      metadata: {
        sourceTemplateId: existing.id,
        sourceTemplateName: existing.name,
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
