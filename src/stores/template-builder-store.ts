import { create } from "zustand";
import type {
  Block,
  BlockStyle,
  BlockType,
  GlobalStyles,
  TemplateSchema,
  TableRow,
  TableCell,
} from "@/types/template";
import { DEFAULT_GLOBAL_STYLES, DEFAULT_BLOCK_STYLE, DEFAULT_BLOCK_SIZES } from "@/types/template";

export type PaperSize = "A4" | "LETTER" | "LEGAL";
export type Orientation = "PORTRAIT" | "LANDSCAPE";

export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 216, height: 279 },
  LEGAL: { width: 216, height: 356 },
};

interface TemplateBuilderState {
  templateId: string | null;
  templateName: string;
  blocks: Block[];
  selectedBlockId: string | null;
  globalStyles: GlobalStyles;
  paperSize: PaperSize;
  orientation: Orientation;
  isDirty: boolean;

  // Actions
  setTemplateName: (name: string) => void;
  setPaperSize: (size: PaperSize) => void;
  setOrientation: (orientation: Orientation) => void;
  setBlocks: (blocks: Block[]) => void;
  addBlock: (block: Block) => void;
  addBlockAtPosition: (type: BlockType, x: number, y: number) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  updateBlockProperties: (id: string, properties: Partial<Block["properties"]>) => void;
  updateBlockStyle: (id: string, style: Partial<BlockStyle>) => void;
  updateBlockPosition: (id: string, x: number, y: number) => void;
  updateBlockSize: (id: string, width: number, height: number) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  selectBlock: (id: string | null) => void;
  setGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  loadTemplate: (schema: TemplateSchema & { id?: string; name?: string; paperSize?: PaperSize; orientation?: Orientation }) => void;
  getSchema: () => TemplateSchema;
  resetDirty: () => void;
  reset: () => void;

  // Alignment actions
  alignBlock: (id: string, alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Table-specific actions
  addTableRow: (blockId: string, afterIndex?: number) => void;
  removeTableRow: (blockId: string, rowIndex: number) => void;
  addTableColumn: (blockId: string, afterIndex?: number) => void;
  removeTableColumn: (blockId: string, colIndex: number) => void;
  updateTableCell: (blockId: string, rowIndex: number, colIndex: number, updates: Partial<TableCell>) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function getDefaultProperties(type: BlockType): Block["properties"] {
  switch (type) {
    case "text":
      return { content: "Text", placeholder: "Enter text..." };
    case "table":
      return {
        rows: [
          { cells: [{ content: "Label", isLabel: true }, { content: "", variable: "" }], isHeader: false },
          { cells: [{ content: "Label", isLabel: true }, { content: "", variable: "" }], isHeader: false },
        ],
        showBorders: true,
        stripedRows: false,
      };
    case "image":
      return { src: "", alt: "", width: "100%", height: "auto", objectFit: "contain" };
    case "container":
      return { direction: "column", gap: 8, justifyContent: "start", alignItems: "stretch", children: [] };
    case "divider":
      return { thickness: 1, color: "#e5e7eb", style: "solid" };
    case "spacer":
      return { height: 20 };
    default:
      return {};
  }
}

const initialState = {
  templateId: null as string | null,
  templateName: "Untitled Template",
  blocks: [] as Block[],
  selectedBlockId: null as string | null,
  globalStyles: DEFAULT_GLOBAL_STYLES,
  paperSize: "A4" as PaperSize,
  orientation: "PORTRAIT" as Orientation,
  isDirty: false,
};

export const useTemplateBuilderStore = create<TemplateBuilderState>(
  (set, get) => ({
    ...initialState,

    setTemplateName: (name) => set({ templateName: name, isDirty: true }),
    setPaperSize: (size) => set({ paperSize: size, isDirty: true }),
    setOrientation: (orientation) => set({ orientation, isDirty: true }),

    setBlocks: (blocks) => set({ blocks, isDirty: true }),

    addBlock: (block) =>
      set((state) => ({
        blocks: [...state.blocks, block],
        isDirty: true,
        selectedBlockId: block.id,
      })),

    addBlockAtPosition: (type, x, y) =>
      set((state) => {
        const id = generateId();
        const sizes = DEFAULT_BLOCK_SIZES[type];
        const newBlock: Block = {
          id,
          type,
          properties: getDefaultProperties(type),
          style: {
            ...DEFAULT_BLOCK_STYLE,
            x,
            y,
            width: sizes.width,
            height: sizes.height,
          },
        };
        return {
          blocks: [...state.blocks, newBlock],
          isDirty: true,
          selectedBlockId: id,
        };
      }),

    updateBlock: (id, updates) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          block.id === id ? { ...block, ...updates } : block
        ),
        isDirty: true,
      })),

    updateBlockProperties: (id, properties) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          block.id === id
            ? { ...block, properties: { ...block.properties, ...properties } as Block["properties"] }
            : block
        ),
        isDirty: true,
      })),

    updateBlockStyle: (id, style) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          block.id === id
            ? { ...block, style: { ...block.style, ...style } }
            : block
        ),
        isDirty: true,
      })),

    updateBlockPosition: (id, x, y) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          block.id === id
            ? { ...block, style: { ...block.style, x, y } }
            : block
        ),
        isDirty: true,
      })),

    updateBlockSize: (id, width, height) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          block.id === id
            ? { ...block, style: { ...block.style, width, height } }
            : block
        ),
        isDirty: true,
      })),

    removeBlock: (id) =>
      set((state) => ({
        blocks: state.blocks.filter((block) => block.id !== id),
        selectedBlockId:
          state.selectedBlockId === id ? null : state.selectedBlockId,
        isDirty: true,
      })),

    duplicateBlock: (id) =>
      set((state) => {
        const originalBlock = state.blocks.find((b) => b.id === id);
        if (!originalBlock) return state;

        const newBlock: Block = {
          ...JSON.parse(JSON.stringify(originalBlock)),
          id: generateId(),
          style: {
            ...originalBlock.style,
            x: originalBlock.style.x + 20,
            y: originalBlock.style.y + 20,
          },
        };

        return {
          blocks: [...state.blocks, newBlock],
          isDirty: true,
          selectedBlockId: newBlock.id,
        };
      }),

    selectBlock: (id) => set({ selectedBlockId: id }),

    setGlobalStyles: (styles) =>
      set((state) => ({
        globalStyles: { ...state.globalStyles, ...styles },
        isDirty: true,
      })),

    loadTemplate: (schema) =>
      set({
        templateId: schema.id || null,
        templateName: schema.name || "Untitled Template",
        blocks: schema.blocks,
        globalStyles: schema.globalStyles,
        paperSize: schema.paperSize || "A4",
        orientation: schema.orientation || "PORTRAIT",
        isDirty: false,
        selectedBlockId: null,
      }),

    getSchema: () => {
      const state = get();
      return {
        blocks: state.blocks,
        variables: [],
        globalStyles: state.globalStyles,
      };
    },

    resetDirty: () => set({ isDirty: false }),

    reset: () => set(initialState),

    // Alignment actions
    alignBlock: (id, alignment) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === id);
        if (!block) return state;

        const paperDimensions = PAPER_DIMENSIONS[state.paperSize];
        const canvasWidth = state.orientation === "PORTRAIT" ? paperDimensions.width : paperDimensions.height;
        const canvasHeight = state.orientation === "PORTRAIT" ? paperDimensions.height : paperDimensions.width;
        // Convert mm to pixels (approximately 3.78 px/mm at 96 DPI)
        const pxPerMm = 3.78;
        const canvasWidthPx = canvasWidth * pxPerMm;
        const canvasHeightPx = canvasHeight * pxPerMm;

        let newX = block.style.x;
        let newY = block.style.y;

        switch (alignment) {
          case "left":
            newX = 20;
            break;
          case "center":
            newX = (canvasWidthPx - block.style.width) / 2;
            break;
          case "right":
            newX = canvasWidthPx - block.style.width - 20;
            break;
          case "top":
            newY = 20;
            break;
          case "middle":
            newY = (canvasHeightPx - block.style.height) / 2;
            break;
          case "bottom":
            newY = canvasHeightPx - block.style.height - 20;
            break;
        }

        return {
          blocks: state.blocks.map((b) =>
            b.id === id
              ? { ...b, style: { ...b.style, x: newX, y: newY } }
              : b
          ),
          isDirty: true,
        };
      }),

    bringToFront: (id) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === id);
        if (!block) return state;

        return {
          blocks: [
            ...state.blocks.filter((b) => b.id !== id),
            block,
          ],
          isDirty: true,
        };
      }),

    sendToBack: (id) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === id);
        if (!block) return state;

        return {
          blocks: [
            block,
            ...state.blocks.filter((b) => b.id !== id),
          ],
          isDirty: true,
        };
      }),

    // Table actions
    addTableRow: (blockId, afterIndex) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return state;

        const props = block.properties as { rows: TableRow[] };
        const colCount = props.rows[0]?.cells.length || 2;
        const newRow: TableRow = {
          cells: Array(colCount).fill(null).map(() => ({ content: "" })),
          isHeader: false,
        };

        const newRows = [...props.rows];
        const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newRows.length;
        newRows.splice(insertIndex, 0, newRow);

        return {
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),

    removeTableRow: (blockId, rowIndex) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return state;

        const props = block.properties as { rows: TableRow[] };
        if (props.rows.length <= 1) return state;

        const newRows = props.rows.filter((_, i) => i !== rowIndex);

        return {
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),

    addTableColumn: (blockId, afterIndex) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return state;

        const props = block.properties as { rows: TableRow[] };
        const newRows = props.rows.map((row) => {
          const newCells = [...row.cells];
          const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newCells.length;
          newCells.splice(insertIndex, 0, { content: "" });
          return { ...row, cells: newCells };
        });

        return {
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),

    removeTableColumn: (blockId, colIndex) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return state;

        const props = block.properties as { rows: TableRow[] };
        if (props.rows[0]?.cells.length <= 1) return state;

        const newRows = props.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((_, i) => i !== colIndex),
        }));

        return {
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),

    updateTableCell: (blockId, rowIndex, colIndex, updates) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return state;

        const props = block.properties as { rows: TableRow[] };
        const newRows = props.rows.map((row, ri) =>
          ri === rowIndex
            ? {
                ...row,
                cells: row.cells.map((cell, ci) =>
                  ci === colIndex ? { ...cell, ...updates } : cell
                ),
              }
            : row
        );

        return {
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),
  })
);
