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
  selectedBlockId: string | null; // Deprecated: getter for backward compatibility
  selectedBlockIds: string[];
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
  updateBlocksProperties: (ids: string[], properties: Partial<Block["properties"]>) => void;
  updateBlockStyle: (id: string, style: Partial<BlockStyle>) => void;
  updateBlockPosition: (id: string, x: number, y: number) => void;
  updateBlockPositions: (updates: Map<string, { x: number; y: number }>) => void;
  updateBlockSize: (id: string, width: number, height: number) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  selectBlock: (id: string | null, multi?: boolean) => void;
  groupSelectedBlocks: () => void;
  ungroupSelectedBlocks: () => void;
  setGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  loadTemplate: (schema: TemplateSchema & { id?: string; name?: string; paperSize?: PaperSize; orientation?: Orientation }) => void;
  getSchema: () => TemplateSchema;
  resetDirty: () => void;
  reset: () => void;

  // Alignment actions
  alignBlock: (id: string, alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  distributeBlocks: (axis: "horizontal" | "vertical", gap?: number) => void;
  centerSelectionOnPage: () => void;
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
  selectedBlockIds: [] as string[],
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
        selectedBlockIds: [block.id],
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
          selectedBlockIds: [id],
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

    // NEW: Batch property update
    updateBlocksProperties: (ids, properties) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          ids.includes(block.id)
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

    // NEW: Batch update for multi-drag
    updateBlockPositions: (updates) =>
      set((state) => ({
        blocks: state.blocks.map((block) => {
          const update = updates.get(block.id);
          if (update) {
            return {
              ...block,
              style: {
                ...block.style,
                x: update.x,
                y: update.y,
              },
            };
          }
          return block;
        }),
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
        selectedBlockIds: state.selectedBlockIds.filter((bid) => bid !== id),
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
          selectedBlockIds: [newBlock.id],
        };
      }),

    // NEW: Multi-select logic
    selectBlock: (id, multi = false) =>
      set((state) => {
        if (id === null) {
          return { selectedBlockIds: [], selectedBlockId: null };
        }

        if (multi) {
          const alreadySelected = state.selectedBlockIds.includes(id);
          const newSelection = alreadySelected
            ? state.selectedBlockIds.filter((bid) => bid !== id)
            : [...state.selectedBlockIds, id];

          return {
            selectedBlockIds: newSelection,
            selectedBlockId: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null,
          };
        } else {
          return {
            selectedBlockIds: [id],
            selectedBlockId: id,
          };
        }
      }),

    // NEW: Group logic
    groupSelectedBlocks: () =>
      set((state) => {
        if (state.selectedBlockIds.length < 2) return state;

        const selectedBlocks = state.blocks.filter((b) => state.selectedBlockIds.includes(b.id));
        if (selectedBlocks.length === 0) return state;

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedBlocks.forEach(b => {
          const x = b.style.x ?? 0;
          const y = b.style.y ?? 0;
          const w = b.style.width ?? 0; // Safe fallback
          const h = b.style.height ?? 0; // Safe fallback

          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x + w > maxX) maxX = x + w;
          if (y + h > maxY) maxY = y + h;
        });

        // Safety check if blocks have weird coords
        if (minX === Infinity || minY === Infinity) return state;

        const containerX = minX;
        const containerY = minY;
        const containerWidth = Math.max(10, maxX - minX);
        const containerHeight = Math.max(10, maxY - minY);

        // Reparent blocks to relative coordinates
        const children = selectedBlocks.map(b => ({
          ...b,
          style: {
            ...b.style,
            x: (b.style.x ?? 0) - containerX,
            y: (b.style.y ?? 0) - containerY
          }
        }));

        const containerId = generateId();
        const containerBlock: Block = {
          id: containerId,
          type: "container",
          properties: {
            direction: "column",
            children, // These children will be rendered recursively by ContainerBlock
          },
          style: {
            ...DEFAULT_BLOCK_STYLE,
            x: containerX,
            y: containerY,
            width: containerWidth,
            height: containerHeight,
            backgroundColor: "transparent",
            paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
            borderWidth: 1, // Optional visual indicator
            borderStyle: "dashed",
            borderColor: "#ccc",
          }
        };

        // Remove original blocks and add container
        const newBlocks = state.blocks.filter(b => !state.selectedBlockIds.includes(b.id));
        return {
          blocks: [...newBlocks, containerBlock],
          selectedBlockIds: [containerId],
          selectedBlockId: containerId,
          isDirty: true,
        };
      }),

    // NEW: Ungroup logic
    ungroupSelectedBlocks: () =>
      set((state) => {
        // Find selected containers
        const containersToUngroup = state.blocks.filter(
          b => state.selectedBlockIds.includes(b.id) && b.type === "container"
        );

        if (containersToUngroup.length === 0) return state;

        let newBlocks = [...state.blocks];
        let newSelection: string[] = [];

        containersToUngroup.forEach(container => {
          const props = container.properties as any;
          const children = (props.children || []) as Block[];

          // Reparent children to root
          const liberatedChildren = children.map(child => ({
            ...child,
            style: {
              ...child.style,
              x: container.style.x + child.style.x,
              y: container.style.y + child.style.y
            }
          }));

          // Remove container
          newBlocks = newBlocks.filter(b => b.id !== container.id);
          // Add children
          newBlocks.push(...liberatedChildren);
          // Select children
          newSelection.push(...liberatedChildren.map(c => c.id));
        });

        // Keep other selected items that weren't ungrouped
        const otherSelected = state.selectedBlockIds.filter(id =>
          !containersToUngroup.find(c => c.id === id)
        );

        const finalSelection = [...otherSelected, ...newSelection];

        return {
          blocks: newBlocks,
          selectedBlockIds: finalSelection,
          selectedBlockId: finalSelection[0] || null,
          isDirty: true,
        };
      }),

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
        selectedBlockIds: [],
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
        // Legacy support: redirect to new logic if ID matches selection
        // Actually, let's just use the ID as the target if provided, or selection if not.
        // But for "Batch" operations, we usually use selection.

        // Single block alignment (Align to Page)
        if (state.selectedBlockIds.length <= 1) {
          const targetId = id || state.selectedBlockIds[0];
          if (!targetId) return state;

          const block = state.blocks.find((b) => b.id === targetId);
          if (!block) return state;

          const paperDimensions = PAPER_DIMENSIONS[state.paperSize];
          const canvasWidth = state.orientation === "PORTRAIT" ? paperDimensions.width : paperDimensions.height;
          const canvasHeight = state.orientation === "PORTRAIT" ? paperDimensions.height : paperDimensions.width;
          const pxPerMm = 3.78;
          const canvasWidthPx = canvasWidth * pxPerMm;
          const canvasHeightPx = canvasHeight * pxPerMm;

          let newX = block.style.x;
          let newY = block.style.y;

          switch (alignment) {
            case "left": newX = 20; break;
            case "center": newX = (canvasWidthPx - block.style.width) / 2; break;
            case "right": newX = canvasWidthPx - block.style.width - 20; break;
            case "top": newY = 20; break;
            case "middle": newY = (canvasHeightPx - block.style.height) / 2; break;
            case "bottom": newY = canvasHeightPx - block.style.height - 20; break;
          }

          return {
            blocks: state.blocks.map((b) =>
              b.id === targetId ? { ...b, style: { ...b.style, x: newX, y: newY } } : b
            ),
            isDirty: true,
          };
        }

        // Multi-block alignment - align all selected blocks together
        const selectedBlocks = state.blocks.filter(b => state.selectedBlockIds.includes(b.id));
        if (selectedBlocks.length === 0) return state;

        // Calculate selection bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedBlocks.forEach(b => {
          minX = Math.min(minX, b.style.x);
          minY = Math.min(minY, b.style.y);
          maxX = Math.max(maxX, b.style.x + b.style.width);
          maxY = Math.max(maxY, b.style.y + b.style.height);
        });

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        const updates = new Map<string, { x?: number, y?: number }>();

        selectedBlocks.forEach(b => {
          switch (alignment) {
            // Horizontal alignments - change X only, keep Y
            case "left":
              updates.set(b.id, { x: minX });
              break;
            case "center":
              updates.set(b.id, { x: centerX - b.style.width / 2 });
              break;
            case "right":
              updates.set(b.id, { x: maxX - b.style.width });
              break;
            // Vertical alignments - change Y only, keep X
            case "top":
              updates.set(b.id, { y: minY });
              break;
            case "middle":
              updates.set(b.id, { y: centerY - b.style.height / 2 });
              break;
            case "bottom":
              updates.set(b.id, { y: maxY - b.style.height });
              break;
          }
        });

        return {
          blocks: state.blocks.map((b) => {
            const up = updates.get(b.id);
            return up ? { ...b, style: { ...b.style, ...up } } : b;
          }),
          isDirty: true,
        };
      }),

    // Distribute logic - aligns edges and spaces with gap
    distributeBlocks: (axis: "horizontal" | "vertical", gap: number = 10) => set((state) => {
      if (state.selectedBlockIds.length < 2) return state; // Need at least 2 to distribute

      const selectedBlocks = state.blocks.filter(b => state.selectedBlockIds.includes(b.id));

      // Sort by position on the distribution axis
      selectedBlocks.sort((a, b) => axis === "horizontal" ? a.style.x - b.style.x : a.style.y - b.style.y);

      // Find the alignment edge (topmost Y for horizontal, leftmost X for vertical)
      const alignEdge = axis === "horizontal"
        ? Math.min(...selectedBlocks.map(b => b.style.y)) // Align top edges
        : Math.min(...selectedBlocks.map(b => b.style.x)); // Align left edges

      // Calculate positions with gap
      const updates = new Map<string, { x: number, y: number }>();
      let currentPos = axis === "horizontal" ? selectedBlocks[0].style.x : selectedBlocks[0].style.y;

      selectedBlocks.forEach((b, i) => {
        if (axis === "horizontal") {
          // Distribute horizontally: align top edges, space on X axis
          updates.set(b.id, { x: currentPos, y: alignEdge });
          currentPos += b.style.width + gap;
        } else {
          // Distribute vertically: align left edges, space on Y axis
          updates.set(b.id, { x: alignEdge, y: currentPos });
          currentPos += b.style.height + gap;
        }
      });

      return {
        blocks: state.blocks.map((b) => {
          const update = updates.get(b.id);
          if (update) {
            return {
              ...b,
              style: {
                ...b.style,
                x: update.x,
                y: update.y
              }
            };
          }
          return b;
        }),
        isDirty: true,
      };
    }),

    // NEW: Center entire selection on page
    centerSelectionOnPage: () => set((state) => {
      const selectedBlocks = state.blocks.filter(b => state.selectedBlockIds.includes(b.id));
      if (selectedBlocks.length === 0) return state;

      // Calculate Bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedBlocks.forEach(b => {
        minX = Math.min(minX, b.style.x);
        minY = Math.min(minY, b.style.y);
        maxX = Math.max(maxX, b.style.x + b.style.width);
        maxY = Math.max(maxY, b.style.y + b.style.height);
      });

      const paperDimensions = PAPER_DIMENSIONS[state.paperSize];
      const canvasWidth = state.orientation === "PORTRAIT" ? paperDimensions.width : paperDimensions.height;
      const canvasHeight = state.orientation === "PORTRAIT" ? paperDimensions.height : paperDimensions.width;
      const pxPerMm = 3.78;
      const canvasWidthPx = canvasWidth * pxPerMm;
      const canvasHeightPx = canvasHeight * pxPerMm;

      const selectionWidth = maxX - minX;
      const selectionHeight = maxY - minY;
      const targetX = (canvasWidthPx - selectionWidth) / 2;
      const targetY = (canvasHeightPx - selectionHeight) / 2;

      const dx = targetX - minX;
      const dy = targetY - minY;

      return {
        blocks: state.blocks.map((b) =>
          state.selectedBlockIds.includes(b.id)
            ? { ...b, style: { ...b.style, x: b.style.x + dx, y: b.style.y + dy } }
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
