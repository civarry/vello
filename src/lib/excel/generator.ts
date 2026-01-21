import * as XLSX from "xlsx";

interface VariableInfo {
    key: string;
    label?: string;
    category?: string;
}

/**
 * Generates an Excel template buffer based on the provided variables.
 * @param variables List of variables to be used as headers.
 * @returns Buffer containing the Excel file.
 */
export function generateExcelTemplate(variables: VariableInfo[]): Buffer {
    // sort variables by category for better UX
    const sortedVariables = [...variables].sort((a, b) => {
        if (a.category === b.category) {
            return a.key.localeCompare(b.key);
        }
        return (a.category || "").localeCompare(b.category || "");
    });

    const headers = sortedVariables.map((v) => v.key);

    // Create a worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths (optional, but nice)
    const wscols = headers.map(h => ({ wch: Math.max(h.length + 5, 15) }));
    ws["!cols"] = wscols;

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payslip Data");

    // Write to buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return buffer;
}
