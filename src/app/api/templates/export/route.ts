import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";
import type { Block } from "@/types/template";

// Helper to add timeout to a promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Fetch a remote image and convert to base64 data URL
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000) // 10 second timeout per image
    });

    if (!response.ok) {
      console.log('[Export API] Failed to fetch image:', response.status, url.substring(0, 50));
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    console.log('[Export API] Successfully converted image to data URL:', url.substring(0, 50));
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.log('[Export API] Error fetching image:', error instanceof Error ? error.message : 'unknown', url.substring(0, 50));
    return null;
  }
}

// Convert remote image URLs to base64 data URLs
async function processBlocksWithImages(blocks: Block[]): Promise<Block[]> {
  const processBlock = async (block: Block): Promise<Block> => {
    // Process image blocks with remote URLs
    if (block.type === 'image') {
      const props = block.properties as { src?: string };
      if (props.src && props.src.startsWith('http')) {
        const dataUrl = await fetchImageAsDataUrl(props.src);
        if (dataUrl) {
          return {
            ...block,
            properties: { ...props, src: dataUrl }
          };
        } else {
          // Failed to fetch - return with empty src
          return {
            ...block,
            properties: { ...props, src: '' }
          };
        }
      }
    }

    // Handle container blocks with children
    if (block.type === 'container') {
      const props = block.properties as { children?: Block[] };
      if (props.children && props.children.length > 0) {
        const processedChildren = await Promise.all(props.children.map(processBlock));
        return {
          ...block,
          properties: {
            ...props,
            children: processedChildren
          }
        };
      }
    }

    return block;
  };

  return Promise.all(blocks.map(processBlock));
}

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

    console.log('[Export API] Starting PDF generation, orientation:', orientation, 'blocks:', blocks.length);

    // Process blocks to convert remote images to data URLs
    const processedBlocks = await withTimeout(
      processBlocksWithImages(blocks),
      20000, // 20 second timeout for image processing
      "Image processing timed out"
    );
    console.log('[Export API] Blocks processed with images');

    // Generate PDF buffer with timeout to prevent hanging
    const pdfBuffer = await withTimeout(
      renderToBuffer(
        TemplatePDF({
          blocks: processedBlocks,
          globalStyles,
          paperSize: paperSize ?? "A4",
          orientation: orientation ?? "PORTRAIT",
        })
      ),
      30000, // 30 second timeout
      "PDF generation timed out"
    );

    console.log('[Export API] PDF generated successfully');

    // Log audit event for PDF generation
    await logAuditEvent({
      action: "DOCUMENT_GENERATED",
      user: createAuditUserContext(context),
      resource: {
        type: "document",
        id: "export",
        name: name || "Unnamed document",
      },
      metadata: {
        templateName: name || "Unnamed",
        paperSize: paperSize ?? "A4",
        orientation: orientation ?? "PORTRAIT",
        blockCount: blocks.length,
      },
    });

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
    const errorMessage = error instanceof Error ? error.message : "Failed to export template";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
