import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { getCurrentUser } from "@/lib/auth";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import { applyDataToBlocks } from "@/lib/template-utils";
import { Block, GlobalStyles } from "@/types/template";

// Helper function to convert image URL to base64 data URL
async function convertImageToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch image: ${url}`);
            return url;
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get("content-type") || "image/png";
        return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch (error) {
        console.warn(`Error converting image to base64: ${url}`, error);
        return url;
    }
}

// Process blocks to convert image URLs to base64
async function processBlocksForPDF(blocks: Block[]): Promise<Block[]> {
    const processedBlocks = await Promise.all(
        blocks.map(async (block) => {
            if (block.type === "image") {
                const props = block.properties as { src?: string };
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

export async function POST(request: NextRequest) {
    try {
        const { user, error } = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const body = await request.json();
        const {
            blocks,
            globalStyles,
            paperSize,
            orientation,
            name,
            batchData
        } = body as {
            blocks: Block[];
            globalStyles: GlobalStyles;
            paperSize: "A4" | "LETTER" | "LEGAL";
            orientation: "PORTRAIT" | "LANDSCAPE";
            name: string;
            batchData: Record<string, string>[];
        };

        if (!blocks || !globalStyles || !batchData || !Array.isArray(batchData)) {
            return NextResponse.json(
                { error: "Missing required fields or invalid batch data" },
                { status: 400 }
            );
        }

        // Convert image URLs to base64 once (they're the same for all records)
        const processedBlocks = await processBlocksForPDF(blocks);

        const zip = new JSZip();
        const folder = zip.folder("payslips");

        // Process each record
        for (let i = 0; i < batchData.length; i++) {
            const data = batchData[i];

            // identifying filename from data if possible, e.g. employee name or ID
            let filenamePart = `record-${i + 1}`;

            // Try to find a good filename identifier
            if (data["{{employee.fullName}}"]) filenamePart = data["{{employee.fullName}}"];
            else if (data["{{employee.lastName}}"]) filenamePart = `${data["{{employee.lastName}}"]}-${data["{{employee.firstName}}"] || ""}`;
            else if (data["{{employee.id}}"]) filenamePart = data["{{employee.id}}"];

            // Clean filename
            const safeFilename = filenamePart.replace(/[^a-z0-9\-_]/gi, '_').trim();
            const pdfFilename = `${name}-${safeFilename}.pdf`;

            // Apply data to blocks (use processed blocks with base64 images)
            const filledBlocks = applyDataToBlocks(processedBlocks, data);

            // Render PDF
            const pdfBuffer = await renderToBuffer(
                TemplatePDF({
                    blocks: filledBlocks,
                    globalStyles,
                    paperSize: paperSize ?? "A4",
                    orientation: orientation ?? "PORTRAIT",
                })
            );

            // Add to ZIP
            folder?.file(pdfFilename, pdfBuffer);
        }

        // Generate ZIP file
        const zipContent = await zip.generateAsync({ type: "nodebuffer" });

        // Return ZIP as response
        const zipFilename = `${name}-batch-export.zip`;

        return new NextResponse(zipContent as any, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${zipFilename}"`,
                "Content-Length": zipContent.length.toString(),
            },
        });

    } catch (error) {
        console.error("Batch export error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate batch export" },
            { status: 500 }
        );
    }
}
