import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import type { TemplateSchema } from "@/types/template";

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

    const schema = template.schema as unknown as TemplateSchema;

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      TemplatePDF({
        blocks: schema.blocks,
        globalStyles: schema.globalStyles,
        paperSize: template.paperSize as "A4" | "LETTER" | "LEGAL",
        orientation: template.orientation as "PORTRAIT" | "LANDSCAPE",
      })
    );

    // Return PDF as response
    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template.name}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to export template:", error);
    return NextResponse.json(
      { error: "Failed to export template" },
      { status: 500 }
    );
  }
}
