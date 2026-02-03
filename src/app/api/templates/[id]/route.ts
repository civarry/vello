import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateTemplateSchema } from "@/lib/validations/template";
import { ZodError } from "zod";
import { hasPermission } from "@/lib/permissions";
import { createForbiddenResponse } from "@/lib/errors";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.template.findFirst({
      where: {
        id,
        organizationId: context.currentMembership.organization.id,
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
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);

    // Check if template exists and belongs to user's org
    const existing = await prisma.template.findFirst({
      where: {
        id,
        organizationId: context.currentMembership.organization.id,
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
        ...(validated.templateType && { templateType: validated.templateType }),
        ...(validated.recipientEmailField !== undefined && { recipientEmailField: validated.recipientEmailField }),
        ...(validated.recipientNameField !== undefined && { recipientNameField: validated.recipientNameField }),
      },
    });

    // Check if isDefault was set to true
    const isSettingDefault = validated.isDefault === true && !existing.isDefault;

    // Log audit event
    await logAuditEvent({
      action: isSettingDefault ? "TEMPLATE_SET_DEFAULT" : "TEMPLATE_EDITED",
      user: createAuditUserContext(context),
      resource: {
        type: "template",
        id: template.id,
        name: template.name,
      },
      metadata: {
        changes: Object.keys(validated).filter(
          (key) => validated[key as keyof typeof validated] !== undefined
        ),
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
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Check permission - only OWNER and ADMIN can delete templates
    if (!hasPermission(context.currentMembership.role, "templates:delete")) {
      return createForbiddenResponse("You don't have permission to delete templates");
    }

    const { id } = await params;

    // Check if template exists and belongs to user's org
    const existing = await prisma.template.findFirst({
      where: {
        id,
        organizationId: context.currentMembership.organization.id,
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

    // Log audit event
    await logAuditEvent({
      action: "TEMPLATE_DELETED",
      user: createAuditUserContext(context),
      resource: {
        type: "template",
        id: existing.id,
        name: existing.name,
      },
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
