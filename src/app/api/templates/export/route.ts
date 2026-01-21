import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TemplatePDF } from "@/lib/pdf/template-pdf";

// POST endpoint for exporting without saving first (from builder)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blocks, globalStyles, paperSize, orientation, name } = body;

    if (!blocks || !globalStyles) {
      return NextResponse.json(
        { error: "Missing required fields: blocks and globalStyles" },
        { status: 400 }
      );
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      TemplatePDF({
        blocks,
        globalStyles,
        paperSize: paperSize ?? "A4",
        orientation: orientation ?? "PORTRAIT",
      })
    );

    // Return PDF as response
    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name || "template"}.pdf"`,
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
