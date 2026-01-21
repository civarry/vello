import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import { applyDataToBlocks } from "@/lib/template-utils";
import { Block, GlobalStyles } from "@/types/template";

export async function POST(request: NextRequest) {
    try {
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

        const zip = new JSZip();
        const folder = zip.folder("payslips");

        // Process each record
        // Note: For large batches, this synchronous approach might timeout. 
        // In a production environment, this should be a background job.
        // For now, we process sequentially to avoid memory spikes.

        for (let i = 0; i < batchData.length; i++) {
            const data = batchData[i];

            // identifying filename from data if possible, e.g. employee name or ID
            // assuming standard variable naming conventions or falling back to index
            let filenamePart = `record-${i + 1}`;

            // Try to find a good filename identifier
            if (data["{{employee.fullName}}"]) filenamePart = data["{{employee.fullName}}"];
            else if (data["{{employee.lastName}}"]) filenamePart = `${data["{{employee.lastName}}"]}-${data["{{employee.firstName}}"] || ""}`;
            else if (data["{{employee.id}}"]) filenamePart = data["{{employee.id}}"];

            // Clean filename
            const safeFilename = filenamePart.replace(/[^a-z0-9\-_]/gi, '_').trim();
            const pdfFilename = `${name}-${safeFilename}.pdf`;

            // Apply data to blocks
            const filledBlocks = applyDataToBlocks(blocks, data);

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
