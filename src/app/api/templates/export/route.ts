import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";

// POST endpoint for exporting without saving first (from builder)
export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getCurrentUser();

    if (!context) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await request.json();
    const { blocks, globalStyles, paperSize, orientation, name } = body;

    if (!blocks || !globalStyles) {
      return NextResponse.json(
        { error: "Missing required fields: blocks and globalStyles" },
        { status: 400 }
      );
    }

    // Pre-process blocks to convert remote image URLs to data URLs
    const processedBlocks = await preprocessBlocksForPdf(blocks);

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      TemplatePDF({
        blocks: processedBlocks,
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
