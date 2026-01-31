import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";
import { Block, GlobalStyles } from "@/types/template";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      blocks,
      globalStyles,
      paperSize = "A4",
      orientation = "PORTRAIT",
    } = body as {
      blocks: Block[];
      globalStyles: GlobalStyles;
      paperSize?: "A4" | "LETTER" | "LEGAL";
      orientation?: "PORTRAIT" | "LANDSCAPE";
    };

    if (!blocks || !globalStyles) {
      return NextResponse.json(
        { error: "Missing required fields: blocks, globalStyles" },
        { status: 400 }
      );
    }

    // Process blocks to convert remote images to data URLs
    const processedBlocks = await preprocessBlocksForPdf(blocks);

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      <TemplatePDF
        blocks={processedBlocks}
        globalStyles={globalStyles}
        paperSize={paperSize}
        orientation={orientation}
      />
    );

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return as PDF
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[PDF Preview] Error generating preview:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF preview" },
      { status: 500 }
    );
  }
}
