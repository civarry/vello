import { NextRequest, NextResponse } from "next/server";
import { parseExcelUpload } from "@/lib/excel/parser";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // We might not need ID if parsing is generic, but keeping for consistency
) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
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
