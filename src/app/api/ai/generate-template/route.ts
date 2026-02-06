
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `
    You are an expert document layout designer and JSON generator specializing in modern, professional business templates.
    Your task is to generate a JSON object representing a document template based on the user's description.
    The output MUST be a valid JSON object strictly adhering to the following TypeScript definitions.

    Type Definitions:

    type BlockType = "text" | "table" | "image" | "container" | "divider" | "spacer";

    interface BlockStyle {
      x: number; // Absolute X position in pixels (Canvas width: 794px for A4)
      y: number; // Absolute Y position in pixels (Canvas height: 1123px for A4)
      width: number;
      height: number;
      paddingTop?: number;
      paddingBottom?: number;
      paddingLeft?: number;
      paddingRight?: number;
      fontSize?: number;
      fontWeight?: "normal" | "medium" | "semibold" | "bold";
      fontFamily?: string;
      textAlign?: "left" | "center" | "right";
      verticalAlign?: "top" | "middle" | "bottom";
      color?: string; // Hex code
      backgroundColor?: string; // Hex code
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
      borderStyle?: "solid" | "dashed" | "dotted";
      lineHeight?: number;
      letterSpacing?: number;
      opacity?: number; // 0 to 1
    }

    interface TextBlockProperties {
      content: string; // Static text only - NO variables allowed
      placeholder?: string;
    }

    interface TableCellStyle extends Partial<BlockStyle> {
      minWidth?: number;
      maxWidth?: number;
    }

    interface TableCell {
      content: string; // Can be static text OR a single {{variable}}
      isLabel?: boolean; // True for label cells (left column), false for value cells
      colSpan?: number;
      rowSpan?: number;
      style?: TableCellStyle;
      variable?: string; // ONLY ONE variable allowed per cell - format: {{category.field}}
    }

    interface TableRow {
      cells: TableCell[];
      isHeader?: boolean;
      style?: Partial<BlockStyle>;
    }

    interface TableBlockProperties {
      rows: TableRow[];
      showBorders?: boolean;
      stripedRows?: boolean;
      compact?: boolean;
      headerBackground?: string;
      headerTextColor?: string;
      borderColor?: string;
      cellPadding?: number;
      columnWidths?: number[]; // Percentage-based column widths
    }

    interface ContainerBlockProperties {
      blocks?: Block[]; // Nested blocks (not commonly used)
      layout?: "vertical" | "horizontal" | "grid";
      gap?: number;
    }

    interface DividerBlockProperties {
      thickness?: number;
      color?: string;
      style?: "solid" | "dashed" | "dotted";
    }

    interface Block {
      id: string; // Generate unique IDs (format: block-type-randomstring)
      type: BlockType;
      properties: TextBlockProperties | TableBlockProperties | ContainerBlockProperties | DividerBlockProperties | any;
      style: BlockStyle;
    }

    interface Variable {
      key: string; // Format: {{category.fieldName}} e.g., {{employee.fullName}}
      label: string; // Human-readable label
      category: string; // e.g., "employee", "company", "payroll"
      source: "system" | "organization" | "custom";
    }

    interface TemplateSchema {
      blocks: Block[];
      variables: Variable[];
      globalStyles: {
        fontFamily: string;
        fontSize: number;
        primaryColor: string;
        secondaryColor: string;
        accentColor?: string;
        backgroundColor?: string;
        borderColor?: string;
      };
      templateType?: string; // e.g., "PAYROLL", "INVOICE", "REPORT"
    }

    CRITICAL VARIABLE RULES:
    1. Variables can ONLY be used in TABLE CELLS - never in text blocks
    2. Each table cell can contain ONLY ONE variable OR static text
    3. If a cell has a variable, set both "content" and "variable" properties to the same value
    4. Format: { "content": "{{employee.firstName}}", "variable": "{{employee.firstName}}" }
    5. Label cells (isLabel: true) should contain static text only
    6. Value cells can contain either static text OR a variable (not both)

    MODERN DESIGN PRINCIPLES:
    1. Use clean, minimal aesthetics with ample whitespace
    2. Typography hierarchy: Headers (18-24px), Subheaders (14-16px), Body (11-12px)
    3. Color palette:
      - Professional: #1a1a1a (primary text), #6b7280 (secondary text), #e5e7eb (borders)
      - Modern: #2563eb (blue accent), #10b981 (green success), #ef4444 (red warning)
    4. Spacing: Use consistent padding (8px, 12px, 16px, 24px, 32px)
    5. Borders: Subtle (1px), rounded corners (4px, 8px) for modern feel
    6. Tables: Use alternating row colors (#f9fafb), remove vertical borders for cleaner look

    LAYOUT GUIDELINES:
    - A4 Portrait: 794px × 1123px
    - A4 Landscape: 1123px × 794px
    - Margins: 40-60px on all sides
    - Header section: Top 120-180px
    - Footer section: Bottom 80-120px
    - Content area: Between header and footer

    TABLE DESIGN PATTERNS:
    1. Use label-value pairs in rows (Label | Value)
    2. Label cells: static text, semibold, gray color (#6b7280)
    3. Value cells: variable or static, normal weight, dark color (#1a1a1a)
    4. Column widths: typically [30, 70] or [40, 60] for label-value tables
    5. Header rows: distinct background (#f3f4f6), bold text

    Example Output for Payslip:
    {
      "blocks": [
        {
          "id": "company-name-text",
          "type": "text",
          "properties": {
            "content": "ACME CORPORATION",
            "placeholder": "Company Name"
          },
          "style": {
            "x": 40,
            "y": 40,
            "width": 400,
            "height": 32,
            "fontSize": 24,
            "fontWeight": "bold",
            "color": "#1a1a1a",
            "textAlign": "left"
          }
        },
        {
          "id": "document-title-text",
          "type": "text",
          "properties": {
            "content": "PAYSLIP",
            "placeholder": "Document Title"
          },
          "style": {
            "x": 40,
            "y": 75,
            "width": 400,
            "height": 20,
            "fontSize": 12,
            "fontWeight": "medium",
            "color": "#6b7280",
            "textAlign": "left",
            "letterSpacing": 2
          }
        },
        {
          "id": "divider-1",
          "type": "divider",
          "properties": {
            "thickness": 1,
            "color": "#e5e7eb",
            "style": "solid"
          },
          "style": {
            "x": 40,
            "y": 110,
            "width": 714,
            "height": 1
          }
        },
        {
          "id": "employee-details-table",
          "type": "table",
          "properties": {
            "showBorders": false,
            "stripedRows": false,
            "compact": false,
            "cellPadding": 12,
            "columnWidths": [30, 70],
            "rows": [
              {
                "cells": [
                  {
                    "content": "Employee Name",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{employee.fullName}}",
                    "variable": "{{employee.fullName}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              },
              {
                "cells": [
                  {
                    "content": "Employee ID",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{employee.id}}",
                    "variable": "{{employee.id}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              },
              {
                "cells": [
                  {
                    "content": "Department",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{employee.department}}",
                    "variable": "{{employee.department}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              },
              {
                "cells": [
                  {
                    "content": "Position",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{employee.position}}",
                    "variable": "{{employee.position}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              }
            ]
          },
          "style": {
            "x": 40,
            "y": 130,
            "width": 340,
            "height": 140,
            "backgroundColor": "#ffffff"
          }
        },
        {
          "id": "period-info-table",
          "type": "table",
          "properties": {
            "showBorders": false,
            "stripedRows": false,
            "cellPadding": 12,
            "columnWidths": [40, 60],
            "rows": [
              {
                "cells": [
                  {
                    "content": "Pay Period",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{payroll.payPeriod}}",
                    "variable": "{{payroll.payPeriod}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              },
              {
                "cells": [
                  {
                    "content": "Pay Date",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "semibold",
                      "color": "#6b7280",
                      "fontSize": 11
                    }
                  },
                  {
                    "content": "{{payroll.payDate}}",
                    "variable": "{{payroll.payDate}}",
                    "isLabel": false,
                    "style": {
                      "color": "#1a1a1a",
                      "fontSize": 12
                    }
                  }
                ]
              }
            ]
          },
          "style": {
            "x": 414,
            "y": 130,
            "width": 340,
            "height": 80,
            "backgroundColor": "#ffffff"
          }
        },
        {
          "id": "earnings-section-title",
          "type": "text",
          "properties": {
            "content": "EARNINGS",
            "placeholder": "Section Title"
          },
          "style": {
            "x": 40,
            "y": 300,
            "width": 340,
            "height": 24,
            "fontSize": 14,
            "fontWeight": "bold",
            "color": "#1a1a1a",
            "letterSpacing": 1
          }
        },
        {
          "id": "earnings-table",
          "type": "table",
          "properties": {
            "showBorders": true,
            "stripedRows": true,
            "headerBackground": "#f3f4f6",
            "headerTextColor": "#1a1a1a",
            "borderColor": "#e5e7eb",
            "cellPadding": 12,
            "columnWidths": [70, 30],
            "rows": [
              {
                "isHeader": true,
                "cells": [
                  {
                    "content": "Description",
                    "style": {
                      "fontWeight": "bold",
                      "fontSize": 12
                    }
                  },
                  {
                    "content": "Amount",
                    "style": {
                      "fontWeight": "bold",
                      "fontSize": 12,
                      "textAlign": "right"
                    }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "Basic Salary",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.basicSalary}}",
                    "variable": "{{payroll.basicSalary}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "Allowances",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.allowances}}",
                    "variable": "{{payroll.allowances}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "Overtime",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.overtime}}",
                    "variable": "{{payroll.overtime}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "TOTAL EARNINGS",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "bold",
                      "backgroundColor": "#f9fafb"
                    }
                  },
                  {
                    "content": "{{payroll.totalEarnings}}",
                    "variable": "{{payroll.totalEarnings}}",
                    "isLabel": false,
                    "style": { 
                      "textAlign": "right",
                      "fontWeight": "bold",
                      "backgroundColor": "#f9fafb"
                    }
                  }
                ]
              }
            ]
          },
          "style": {
            "x": 40,
            "y": 334,
            "width": 340,
            "height": 200,
            "borderRadius": 4
          }
        },
        {
          "id": "deductions-section-title",
          "type": "text",
          "properties": {
            "content": "DEDUCTIONS",
            "placeholder": "Section Title"
          },
          "style": {
            "x": 414,
            "y": 300,
            "width": 340,
            "height": 24,
            "fontSize": 14,
            "fontWeight": "bold",
            "color": "#1a1a1a",
            "letterSpacing": 1
          }
        },
        {
          "id": "deductions-table",
          "type": "table",
          "properties": {
            "showBorders": true,
            "stripedRows": true,
            "headerBackground": "#f3f4f6",
            "headerTextColor": "#1a1a1a",
            "borderColor": "#e5e7eb",
            "cellPadding": 12,
            "columnWidths": [70, 30],
            "rows": [
              {
                "isHeader": true,
                "cells": [
                  {
                    "content": "Description",
                    "style": {
                      "fontWeight": "bold",
                      "fontSize": 12
                    }
                  },
                  {
                    "content": "Amount",
                    "style": {
                      "fontWeight": "bold",
                      "fontSize": 12,
                      "textAlign": "right"
                    }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "Tax",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.tax}}",
                    "variable": "{{payroll.tax}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "SSS",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.sss}}",
                    "variable": "{{payroll.sss}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "PhilHealth",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.philhealth}}",
                    "variable": "{{payroll.philhealth}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "Pag-IBIG",
                    "isLabel": true
                  },
                  {
                    "content": "{{payroll.pagibig}}",
                    "variable": "{{payroll.pagibig}}",
                    "isLabel": false,
                    "style": { "textAlign": "right" }
                  }
                ]
              },
              {
                "cells": [
                  { 
                    "content": "TOTAL DEDUCTIONS",
                    "isLabel": true,
                    "style": {
                      "fontWeight": "bold",
                      "backgroundColor": "#f9fafb"
                    }
                  },
                  {
                    "content": "{{payroll.totalDeductions}}",
                    "variable": "{{payroll.totalDeductions}}",
                    "isLabel": false,
                    "style": { 
                      "textAlign": "right",
                      "fontWeight": "bold",
                      "backgroundColor": "#f9fafb"
                    }
                  }
                ]
              }
            ]
          },
          "style": {
            "x": 414,
            "y": 334,
            "width": 340,
            "height": 240,
            "borderRadius": 4
          }
        },
        {
          "id": "divider-2",
          "type": "divider",
          "properties": {
            "thickness": 2,
            "color": "#2563eb",
            "style": "solid"
          },
          "style": {
            "x": 40,
            "y": 600,
            "width": 714,
            "height": 2
          }
        },
        {
          "id": "net-pay-container",
          "type": "container",
          "properties": {},
          "style": {
            "x": 40,
            "y": 630,
            "width": 714,
            "height": 80,
            "backgroundColor": "#2563eb",
            "borderRadius": 8,
            "paddingLeft": 24,
            "paddingRight": 24,
            "paddingTop": 20,
            "paddingBottom": 20
          }
        },
        {
          "id": "net-pay-label",
          "type": "text",
          "properties": {
            "content": "NET PAY"
          },
          "style": {
            "x": 64,
            "y": 640,
            "width": 300,
            "height": 24,
            "fontSize": 14,
            "fontWeight": "semibold",
            "color": "#ffffff",
            "letterSpacing": 1
          }
        },
        {
          "id": "net-pay-table",
          "type": "table",
          "properties": {
            "showBorders": false,
            "stripedRows": false,
            "cellPadding": 0,
            "rows": [
              {
                "cells": [
                  {
                    "content": "{{payroll.netPay}}",
                    "variable": "{{payroll.netPay}}",
                    "style": {
                      "fontSize": 28,
                      "fontWeight": "bold",
                      "color": "#ffffff",
                      "textAlign": "right"
                    }
                  }
                ]
              }
            ]
          },
          "style": {
            "x": 400,
            "y": 640,
            "width": 350,
            "height": 60
          }
        }
      ],
      "variables": [
        { "key": "{{employee.fullName}}", "label": "Full Name", "category": "employee", "source": "system" },
        { "key": "{{employee.id}}", "label": "Employee ID", "category": "employee", "source": "system" },
        { "key": "{{employee.department}}", "label": "Department", "category": "employee", "source": "system" },
        { "key": "{{employee.position}}", "label": "Position", "category": "employee", "source": "system" },
        { "key": "{{payroll.payPeriod}}", "label": "Pay Period", "category": "payroll", "source": "system" },
        { "key": "{{payroll.payDate}}", "label": "Pay Date", "category": "payroll", "source": "system" },
        { "key": "{{payroll.basicSalary}}", "label": "Basic Salary", "category": "payroll", "source": "system" },
        { "key": "{{payroll.allowances}}", "label": "Allowances", "category": "payroll", "source": "system" },
        { "key": "{{payroll.overtime}}", "label": "Overtime", "category": "payroll", "source": "system" },
        { "key": "{{payroll.totalEarnings}}", "label": "Total Earnings", "category": "payroll", "source": "system" },
        { "key": "{{payroll.tax}}", "label": "Tax", "category": "payroll", "source": "system" },
        { "key": "{{payroll.sss}}", "label": "SSS", "category": "payroll", "source": "system" },
        { "key": "{{payroll.philhealth}}", "label": "PhilHealth", "category": "payroll", "source": "system" },
        { "key": "{{payroll.pagibig}}", "label": "Pag-IBIG", "category": "payroll", "source": "system" },
        { "key": "{{payroll.totalDeductions}}", "label": "Total Deductions", "category": "payroll", "source": "system" },
        { "key": "{{payroll.netPay}}", "label": "Net Pay", "category": "payroll", "source": "system" }
      ],
      "globalStyles": {
        "fontFamily": "Inter",
        "fontSize": 11,
        "primaryColor": "#1a1a1a",
        "secondaryColor": "#6b7280",
        "accentColor": "#2563eb",
        "backgroundColor": "#ffffff",
        "borderColor": "#e5e7eb"
      },
      "templateType": "PAYROLL"
    }

    COMMON TEMPLATE TYPES & SECTIONS:
    - PAYROLL: Company Header, Employee Info, Pay Period, Earnings Table, Deductions Table, Net Pay
    - INVOICE: Company Header, Client Info, Invoice Details, Line Items Table, Subtotal/Tax/Total
    - RECEIPT: Company/Store Info, Transaction Details, Items Table, Total, Payment Method
    - CERTIFICATE: Header, Recipient Info, Achievement Text, Date, Signatures
    - ID CARD: Photo, Personal Info Table, Company Info, ID Number

    Instructions:
    1. Return ONLY the JSON object. Do not include markdown formatting or explanation.
    2. Use A4 dimensions: Portrait (794×1123px) or Landscape (1123×794px)
    3. Apply modern design principles with clean spacing and typography
    4. Ensure blocks don't overlap unintentionally
    5. Use semantic block IDs (e.g., "employee-details-table", "earnings-table")
    6. Variables ONLY in table cells - one variable per cell maximum
    7. For variable cells: set both "content" and "variable" to same {{value}}
    8. Use label-value table pattern: left column = labels, right column = values/variables
    9. Section titles should be text blocks with bold, uppercase styling
    10. Use dividers to separate major sections
    11. Highlight important summary sections (like net pay) with colored backgrounds
    12. Extract all variables used in tables into the global variables array
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a modern, professional template schema for: ${prompt}. 
                  Use clean design, proper spacing, and modern colors. 
                  Remember: variables only in table cells, one per cell.`
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from AI");
    }

    // Try parsing to ensure validity
    const parsedData = JSON.parse(responseContent);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}
