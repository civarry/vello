import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Type definitions for better type safety
interface GenerateTemplateRequest {
  prompt: string;
  currentSchema?: {
    blocks: any[];
    globalStyles: any;
  };
}

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body: GenerateTemplateRequest = await req.json();
    const { prompt, currentSchema } = body;

    // Validation
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: "A valid prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt is too long. Please keep it under 1000 characters." },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not configured in environment variables");
      return NextResponse.json(
        { error: "AI service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });
    const isRedesign = Boolean(currentSchema?.blocks?.length);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(isRedesign);

    // Build messages
    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(prompt, currentSchema, isRedesign) }
    ];

    // Call Groq API with timeout handling
    const completion = await Promise.race([
      groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI request timeout")), 30000)
      )
    ]);

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("AI returned an empty response");
    }

    // Parse and validate response
    let parsedData;
    try {
      parsedData = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseContent);
      throw new Error("AI returned invalid JSON");
    }

    // Validate schema structure
    if (!parsedData.blocks || !Array.isArray(parsedData.blocks)) {
      throw new Error("Invalid template schema: missing blocks array");
    }

    if (!parsedData.globalStyles || typeof parsedData.globalStyles !== 'object') {
      throw new Error("Invalid template schema: missing globalStyles");
    }

    // Sanitize response before returning
    const sanitizedData = sanitizeTemplateSchema(parsedData);

    return NextResponse.json(sanitizedData);

  } catch (error: any) {
    console.error("AI Generation Error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error messages
    const errorMessage = getUserFriendlyError(error);
    const statusCode = error.message?.includes("timeout") ? 504 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

function buildSystemPrompt(isRedesign: boolean): string {
  return `You are an expert document layout designer and JSON generator specializing in modern, professional business templates.
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

${isRedesign ? `
REDESIGN MODE ACTIVE:
You are redesigning an EXISTING template.
1. You MUST preserve ALL 'id', 'content', 'variable', 'type', and 'rows' (data structure) properties from the input schema.
2. You MAY modify 'style', positions ('x', 'y'), sizes ('width', 'height'), block properties ('showBorders', 'stripedRows'), and globalStyles.
3. DO NOT add or remove blocks unless explicitly asked (e.g., "add a divider").
4. DO NOT change the data/content. Only change the LOOK and LAYOUT.
` : `
CREATION MODE ACTIVE:
Generate a template from scratch based on the prompt.
`}

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
12. Extract all variables used in tables into the global variables array`;
}

function buildUserPrompt(
  prompt: string,
  currentSchema: any,
  isRedesign: boolean
): string {
  if (isRedesign && currentSchema) {
    return `Redesign this template based on the following request.

Current Schema: ${JSON.stringify(currentSchema)}

User Request: ${prompt}

IMPORTANT: Preserve all content, IDs, and data structure. Only update styles, layout, and visual properties.`;
  }

  return `Create a modern, professional template schema for: ${prompt}

Use clean design, proper spacing, and modern colors.
Remember: variables only in table cells, one per cell.`;
}

function sanitizeTemplateSchema(schema: any): any {
  // Basic sanitization - you can expand this based on security needs
  return {
    blocks: schema.blocks || [],
    variables: schema.variables || [],
    globalStyles: schema.globalStyles || {},
    templateType: schema.templateType
  };
}

function getUserFriendlyError(error: any): string {
  const message = error.message || "";

  if (message.includes("timeout")) {
    return "The AI request took too long. Please try again with a simpler prompt.";
  }

  if (message.includes("API key") || message.includes("authentication")) {
    return "AI service authentication failed. Please contact support.";
  }

  if (message.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (message.includes("invalid JSON") || message.includes("parse")) {
    return "The AI generated an invalid response. Please try again.";
  }

  if (message.includes("Invalid template schema")) {
    return message; // Already user-friendly
  }

  return "Failed to generate template. Please try again or rephrase your prompt.";
}