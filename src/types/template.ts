export type BlockType =
  | "text"
  | "table"
  | "image"
  | "container"
  | "divider"
  | "spacer";

export interface BlockStyle {
  // Position (absolute positioning on canvas)
  x: number;
  y: number;
  width: number;
  height: number;

  // Spacing (internal)
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;

  // Typography
  fontSize?: number;
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  color?: string;
  lineHeight?: number;

  // Background & Border
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
}

export interface TableCell {
  content: string;
  variable?: string; // Variable key like "{{employee.name}}" for auto-fill
  isLabel?: boolean; // If true, this cell is a label (not a data field)
  labelId?: string; // Custom ID for the label, used to create dynamic variables (e.g., "regularHours" creates regularHours.hours, regularHours.amount)
  colSpan?: number;
  rowSpan?: number;
  style?: Partial<BlockStyle>;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

export interface TextBlockProperties {
  content: string;
  placeholder?: string;
}

export interface TableBlockProperties {
  rows: TableRow[];
  showBorders?: boolean;
  stripedRows?: boolean;
  compact?: boolean;
  headerBackground?: string;
}

export interface ImageBlockProperties {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  objectFit?: "cover" | "contain" | "fill";
}

export interface ContainerBlockProperties {
  direction?: "row" | "column";
  gap?: number;
  justifyContent?: "start" | "center" | "end" | "between" | "around";
  alignItems?: "start" | "center" | "end" | "stretch";
  children?: Block[];
}

export interface DividerBlockProperties {
  thickness?: number;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
}

export interface SpacerBlockProperties {
  height: number;
}

export type BlockProperties =
  | TextBlockProperties
  | TableBlockProperties
  | ImageBlockProperties
  | ContainerBlockProperties
  | DividerBlockProperties
  | SpacerBlockProperties;

export interface Block {
  id: string;
  type: BlockType;
  properties: BlockProperties;
  style: BlockStyle;
}

export interface TemplateVariable {
  key: string;
  label: string;
  category: "employee" | "period" | "company" | "earnings" | "deductions" | "computed";
}

export interface GlobalStyles {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface Template {
  id: string;
  name: string;
  schema: TemplateSchema;
  paperSize: "A4" | "LETTER" | "LEGAL";
  orientation: "PORTRAIT" | "LANDSCAPE";
  createdAt?: Date; // Optional based on DB
  updatedAt?: Date; // Optional based on DB
}

export interface TemplateSchema {
  blocks: Block[];
  variables: TemplateVariable[];
  globalStyles: GlobalStyles;
}

export const STANDARD_VARIABLES: TemplateVariable[] = [
  // Employee
  { key: "{{employee.id}}", label: "Employee ID", category: "employee" },
  { key: "{{employee.firstName}}", label: "First Name", category: "employee" },
  { key: "{{employee.lastName}}", label: "Last Name", category: "employee" },
  { key: "{{employee.fullName}}", label: "Full Name", category: "employee" },
  { key: "{{employee.department}}", label: "Department", category: "employee" },
  { key: "{{employee.position}}", label: "Position", category: "employee" },
  { key: "{{employee.email}}", label: "Email", category: "employee" },

  // Period
  { key: "{{period.start}}", label: "Period Start", category: "period" },
  { key: "{{period.end}}", label: "Period End", category: "period" },
  { key: "{{period.month}}", label: "Pay Month", category: "period" },
  { key: "{{period.year}}", label: "Pay Year", category: "period" },

  // Company
  { key: "{{company.name}}", label: "Company Name", category: "company" },
  { key: "{{company.address}}", label: "Company Address", category: "company" },
  { key: "{{company.logo}}", label: "Company Logo", category: "company" },

  // Earnings (dynamic)
  { key: "{{earnings.basicSalary}}", label: "Basic Salary", category: "earnings" },
  { key: "{{earnings.overtime}}", label: "Overtime Pay", category: "earnings" },
  { key: "{{earnings.allowances}}", label: "Allowances", category: "earnings" },
  { key: "{{earnings.bonus}}", label: "Bonus", category: "earnings" },
  { key: "{{earnings.total}}", label: "Total Earnings", category: "earnings" },

  // Deductions (Philippine-specific)
  { key: "{{deductions.sss}}", label: "SSS", category: "deductions" },
  { key: "{{deductions.philhealth}}", label: "PhilHealth", category: "deductions" },
  { key: "{{deductions.pagibig}}", label: "Pag-IBIG", category: "deductions" },
  { key: "{{deductions.tax}}", label: "Withholding Tax", category: "deductions" },
  { key: "{{deductions.total}}", label: "Total Deductions", category: "deductions" },

  // Computed
  { key: "{{netPay}}", label: "Net Pay", category: "computed" },
  { key: "{{currentDate}}", label: "Current Date", category: "computed" },
];

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  fontFamily: "Inter",
  fontSize: 12,
  primaryColor: "#1a1a1a",
  secondaryColor: "#6b7280",
};

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  x: 20,
  y: 20,
  width: 200,
  height: 40,
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 8,
  paddingRight: 8,
  fontSize: 12,
  fontWeight: "normal",
  textAlign: "left",
  verticalAlign: "top",
  color: "#1a1a1a",
};

// Default sizes for different block types
export const DEFAULT_BLOCK_SIZES: Record<BlockType, { width: number; height: number }> = {
  text: { width: 200, height: 40 },
  table: { width: 400, height: 150 },
  image: { width: 150, height: 100 },
  container: { width: 300, height: 200 },
  divider: { width: 400, height: 2 },
  spacer: { width: 100, height: 40 },
};
