import * as XLSX from "xlsx";

/**
 * Parses an uploaded Excel buffer and returns an array of record objects.
 * @param buffer The file buffer to parse.
 * @returns Array of key-value objects representing the rows.
 */
export function parseExcelUpload(buffer: Buffer): Record<string, string>[] {
    const wb = XLSX.read(buffer, { type: "buffer" });

    if (wb.SheetNames.length === 0) {
        throw new Error("The Excel file contains no sheets.");
    }

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Parse sheet to JSON (array of objects)
    // header: 1 means array of arrays, but we want array of objects with header keys
    // By default, sheet_to_json uses the first row as keys.
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

    // Normalize data to strings
    const stringData = rawData.map((row) => {
        const newRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
            // Handle trimming and simple type conversions if necessary
            if (value !== null && value !== undefined) {
                newRow[key] = String(value).trim();
            } else {
                newRow[key] = "";
            }
        }
        return newRow;
    });

    return stringData;
}
