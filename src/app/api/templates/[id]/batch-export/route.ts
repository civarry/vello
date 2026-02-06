import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";
import { applyDataToBlocks } from "@/lib/template-utils";
import { Block, GlobalStyles } from "@/types/template";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

// Validation schema for batch export
const MAX_BATCH_SIZE = 100;

const batchExportSchema = z.object({
    blocks: z.array(z.object({
        id: z.string(),
        type: z.string(),
        properties: z.record(z.string(), z.unknown()).optional(),
        style: z.record(z.string(), z.unknown()).optional(),
    })).max(500, "Maximum 500 blocks allowed"),
    globalStyles: z.object({
        fontFamily: z.string().optional(),
        fontSize: z.number().optional(),
        primaryColor: z.string().optional(),
    }).passthrough(),
    paperSize: z.enum(["A4", "LETTER", "LEGAL"]).optional(),
    orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).optional(),
    name: z.string().max(200, "Name must be 200 characters or less"),
    batchData: z.array(z.record(z.string(), z.string()))
        .min(1, "At least one record is required")
        .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} records per batch`),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const body = await request.json();

        // Validate request body with Zod
        const parseResult = batchExportSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: parseResult.error.issues[0]?.message || "Invalid request data" },
                { status: 400 }
            );
        }

        const {
            blocks: rawBlocks,
            globalStyles: rawGlobalStyles,
            paperSize,
            orientation,
            name,
            batchData
        } = parseResult.data;

        // Cast to proper types (Zod validates structure, we trust the data)
        const blocks = rawBlocks as unknown as Block[];
        const globalStyles = rawGlobalStyles as unknown as GlobalStyles;

        // Pre-process blocks to convert remote image URLs to data URLs
        const processedBlocks = await preprocessBlocksForPdf(blocks);

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

        // Log audit event
        await logAuditEvent({
            action: "DOCUMENT_BATCH_GENERATED",
            user: createAuditUserContext(context),
            resource: {
                type: "template",
                id: (await params).id,
                name: name,
            },
            metadata: {
                recordCount: batchData.length,
                paperSize,
                orientation,
            },
        });

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
