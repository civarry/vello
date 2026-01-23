import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import { Block } from "@/types/template";

// Helper function to convert image URL to base64 data URL
async function convertImageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`);
      return url; // Return original URL if fetch fails
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(`Error converting image to base64: ${url}`, error);
    return url; // Return original URL if conversion fails
  }
}

// Process blocks to convert image URLs to base64
async function processBlocksForPDF(blocks: Block[]): Promise<Block[]> {
  const processedBlocks = await Promise.all(
    blocks.map(async (block) => {
      if (block.type === "image") {
        const props = block.properties as { src?: string };
        // Only convert if it's an HTTP URL (not already base64)
        if (props?.src && (props.src.startsWith("http://") || props.src.startsWith("https://"))) {
          const base64Src = await convertImageToBase64(props.src);
          return {
            ...block,
            properties: {
              ...block.properties,
              src: base64Src,
            },
          };
        }
      }
      return block;
    })
  );
  return processedBlocks;
}

// POST endpoint for exporting without saving first (from builder)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser();

    if (!user) {
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

    // Convert image URLs to base64 for PDF rendering
    const processedBlocks = await processBlocksForPDF(blocks);

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
