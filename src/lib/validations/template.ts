import { z } from "zod";

export const blockStyleSchema = z.object({
  // Position & Size (required for absolute positioning)
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  // Padding
  paddingTop: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  // Typography
  fontSize: z.number().optional(),
  fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  color: z.string().optional(),
  lineHeight: z.number().optional(),
  // Background & Border
  backgroundColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.number().optional(),
  borderStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
});

export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "table", "image", "container", "divider", "spacer"]),
  properties: z.record(z.string(), z.unknown()),
  style: blockStyleSchema,
});

export const templateSchemaValidator = z.object({
  blocks: z.array(blockSchema),
  variables: z.array(z.object({
    key: z.string(),
    label: z.string(),
    category: z.string(),
  })).optional(),
  globalStyles: z.object({
    fontFamily: z.string(),
    fontSize: z.number(),
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
  }),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional(),
  schema: templateSchemaValidator,
  paperSize: z.enum(["A4", "LETTER", "LEGAL"]).default("A4"),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("PORTRAIT"),
  isDefault: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
