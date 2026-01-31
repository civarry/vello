import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";
import { Block, GlobalStyles } from "@/types/template";

export const maxDuration = 30;

// Helper to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get request body as text first to handle empty bodies gracefully
    const text = await request.text();
    if (!text) {
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

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

    // Log block types for debugging
    const blockTypes = blocks.map((b) => b.type);
    console.log(`[PDF Preview] Starting - ${blocks.length} blocks: ${blockTypes.join(", ")}`);

    // Process blocks to convert remote images to data URLs (10s timeout)
    const processedBlocks = await withTimeout(
      preprocessBlocksForPdf(blocks),
      10000,
      "Image processing timed out"
    );

    // Log any image blocks for debugging
    const imageBlocks = processedBlocks.filter((b) => b.type === "image");
    imageBlocks.forEach((b, i) => {
      const src = (b.properties as { src?: string }).src || "";
      console.log(`[PDF Preview] Image ${i + 1}: ${src.substring(0, 50)}...`);
    });

    console.log(`[PDF Preview] Images processed in ${Date.now() - startTime}ms`);

    // Generate PDF buffer (15s timeout)
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await withTimeout(
        renderToBuffer(
          <TemplatePDF
            blocks={processedBlocks}
            globalStyles={globalStyles}
            paperSize={paperSize}
            orientation={orientation}
          />
        ),
        15000,
        "PDF generation timed out"
      );
    } catch (renderError) {
      console.error(`[PDF Preview] Render error:`, renderError);
      throw renderError;
    }

    console.log(`[PDF Preview] PDF generated in ${Date.now() - startTime}ms, size: ${pdfBuffer.length} bytes`);

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error(`[PDF Preview] Error after ${Date.now() - startTime}ms:`, errorMessage);
    console.error(`[PDF Preview] Stack trace:`, errorStack);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
