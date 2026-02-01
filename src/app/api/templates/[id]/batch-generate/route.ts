import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseExcelUpload } from "@/lib/excel/parser";

// Security: Limit Excel file size to prevent memory exhaustion
const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();

        if (!context) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Security: Validate file size before processing
        if (file.size > MAX_EXCEL_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size exceeds ${MAX_EXCEL_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = parseExcelUpload(buffer);

        return NextResponse.json({ data });

    } catch (error) {
        console.error("Error parsing Excel file:", error);
        return NextResponse.json(
            { error: "Failed to parse Excel file" },
            { status: 500 }
        );
    }
}
