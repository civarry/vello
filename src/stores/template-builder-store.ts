import { create } from "zustand";
import type {
  Block,
  BlockStyle,
  BlockType,
  GlobalStyles,
  TemplateSchema,
  TableRow,
  TableCell,
  Guide,
  TemplateType,
} from "@/types/template";

import { DEFAULT_GLOBAL_STYLES, DEFAULT_BLOCK_STYLE, DEFAULT_BLOCK_SIZES } from "@/types/template";

export type GridSize = 5 | 10 | 20;

export type PaperSize = "A4" | "LETTER" | "LEGAL";
export type Orientation = "PORTRAIT" | "LANDSCAPE";

export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 216, height: 279 },
  LEGAL: { width: 216, height: 356 },
};

// History snapshot type (excludes history itself and transient state)
interface HistorySnapshot {
  blocks: Block[];
  globalStyles: GlobalStyles;
  paperSize: PaperSize;
  orientation: Orientation;
  templateName: string;
  templateType: TemplateType;
  recipientEmailField: string | null;
  recipientNameField: string | null;
}

const MAX_HISTORY_SIZE = 50;

interface TemplateBuilderState {
  templateId: string | null;
  templateName: string;
  templateType: TemplateType;
  recipientEmailField: string | null;
  recipientNameField: string | null;
  blocks: Block[];
  selectedBlockId: string | null; // Deprecated: getter for backward compatibility
  selectedBlockIds: string[];
  globalStyles: GlobalStyles;
  paperSize: PaperSize;
  orientation: Orientation;
  isDirty: boolean;

  // History state for undo/redo
  history: HistorySnapshot[];
  historyIndex: number;

  // Zoom state
  zoom: number;

  // Clipboard for copy/paste
  clipboard: Block[] | null;

  // Guides (persistent, saved with template)
  guides: Guide[];

  // Canvas display options (not saved with template)
  showRulers: boolean;
  showGrid: boolean;
  gridSize: GridSize;
  snapToGrid: boolean;

  // Panel visibility
  showLeftPanel: boolean;
  showRightPanel: boolean;

  // Actions
  setTemplateName: (name: string) => void;
  setTemplateType: (type: TemplateType) => void;
  setRecipientEmailField: (field: string | null) => void;
  setRecipientNameField: (field: string | null) => void;
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
  resizeContainerProportionally: (id: string, newWidth: number, newHeight: number) => void;
  removeBlock: (id: string) => void;
  removeSelectedBlocks: () => void;
  duplicateBlock: (id: string) => void;
  duplicateSelectedBlocks: () => void;
  selectBlock: (id: string | null, multi?: boolean) => void;
  selectAllBlocks: () => void;
  groupSelectedBlocks: () => void;
  ungroupSelectedBlocks: () => void;
  setGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  loadTemplate: (schema: TemplateSchema & {
    id?: string;
    name?: string;
    paperSize?: PaperSize;
    orientation?: Orientation;
    templateType?: TemplateType;
    recipientEmailField?: string | null;
    recipientNameField?: string | null;
  }) => void;
  getSchema: () => TemplateSchema;
  resetDirty: () => void;
  reset: () => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Zoom actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;

  // Copy/Paste actions
  copySelectedBlocks: () => void;
  pasteBlocks: () => void;

  // Nudge actions
  nudgeSelectedBlocks: (dx: number, dy: number) => void;

  // History actions
  pushHistorySnapshot: () => void;

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

  // Guide actions
  addGuide: (orientation: "horizontal" | "vertical", position: number) => void;
  updateGuide: (id: string, position: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  // Canvas display actions
  setShowRulers: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: GridSize) => void;
  setSnapToGrid: (snap: boolean) => void;

  // Panel visibility actions
  setShowLeftPanel: (show: boolean) => void;
  setShowRightPanel: (show: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
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
  templateType: "PAYROLL" as TemplateType,
  recipientEmailField: null as string | null,
  recipientNameField: null as string | null,
  blocks: [] as Block[],
  selectedBlockId: null as string | null,
  selectedBlockIds: [] as string[],
  globalStyles: DEFAULT_GLOBAL_STYLES,
  paperSize: "A4" as PaperSize,
  orientation: "PORTRAIT" as Orientation,
  isDirty: false,
  history: [] as HistorySnapshot[],
  historyIndex: -1,
  zoom: 1,
  clipboard: null as Block[] | null,
  guides: [] as Guide[],
  showRulers: true,
  showGrid: false,
  gridSize: 10 as GridSize,
  snapToGrid: false,
  showLeftPanel: true,
  showRightPanel: true,
};

// Helper to create a history snapshot from current state
function createSnapshot(state: Pick<TemplateBuilderState, 'blocks' | 'globalStyles' | 'paperSize' | 'orientation' | 'templateName' | 'templateType' | 'recipientEmailField' | 'recipientNameField'>): HistorySnapshot {
  return {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    globalStyles: JSON.parse(JSON.stringify(state.globalStyles)),
    paperSize: state.paperSize,
    orientation: state.orientation,
    templateName: state.templateName,
    templateType: state.templateType,
    recipientEmailField: state.recipientEmailField,
    recipientNameField: state.recipientNameField,
  };
}

// History model:
// - history[] contains complete states (oldest first)
// - historyIndex points to the current state being displayed/edited
// - On change: save current state, then apply mutation
// - Undo: decrement historyIndex, restore that state
// - Redo: increment historyIndex, restore that state

// Helper to push current state to history (call BEFORE mutation)
function pushHistory(state: TemplateBuilderState): Partial<TemplateBuilderState> {
  const snapshot = createSnapshot(state);

  // Truncate any "future" states (from previous undos)
  // historyIndex points to current state, so keep up to historyIndex + 1
  const newHistory = state.historyIndex >= 0
    ? state.history.slice(0, state.historyIndex + 1)
    : [];

  newHistory.push(snapshot);

  // Limit history size
  while (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  }

  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

export const useTemplateBuilderStore = create<TemplateBuilderState>(
  (set, get) => ({
    ...initialState,

    setTemplateName: (name) => set((state) => ({
      ...pushHistory(state),
      templateName: name,
      isDirty: true,
    })),

    setTemplateType: (type) => set((state) => ({
      ...pushHistory(state),
      templateType: type,
      isDirty: true,
    })),

    setRecipientEmailField: (field) => set((state) => ({
      ...pushHistory(state),
      recipientEmailField: field,
      isDirty: true,
    })),

    setRecipientNameField: (field) => set((state) => ({
      ...pushHistory(state),
      recipientNameField: field,
      isDirty: true,
    })),

    setPaperSize: (size) => set((state) => ({
      ...pushHistory(state),
      paperSize: size,
      isDirty: true,
    })),

    setOrientation: (orientation) => set((state) => ({
      ...pushHistory(state),
      orientation,
      isDirty: true,
    })),

    setBlocks: (blocks) => set((state) => ({
      ...pushHistory(state),
      blocks,
      isDirty: true,
    })),

    addBlock: (block) =>
      set((state) => ({
        ...pushHistory(state),
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
          ...pushHistory(state),
          blocks: [...state.blocks, newBlock],
          isDirty: true,
          selectedBlockId: id,
          selectedBlockIds: [id],
        };
      }),

    // Note: These update functions don't push history - call pushHistorySnapshot() before starting edits
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

    // Batch property update - no history push, call pushHistorySnapshot() before batch edits
    updateBlocksProperties: (ids, properties) =>
      set((state) => ({
        blocks: state.blocks.map((block) =>
          ids.includes(block.id)
            ? { ...block, properties: { ...block.properties, ...properties } as Block["properties"] }
            : block
        ),
        isDirty: true,
      })),

    // Style/position/size updates don't push history - call pushHistorySnapshot() before drag/resize
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

    // Batch update for multi-drag - no history push
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

    // Proportionally resize a container and all its children
    resizeContainerProportionally: (id, newWidth, newHeight) =>
      set((state) => {
        const block = state.blocks.find((b) => b.id === id);
        if (!block || block.type !== "container") return state;

        const props = block.properties as { children?: Block[] };
        const children = props.children || [];
        if (children.length === 0) {
          // No children, just resize normally
          return {
            blocks: state.blocks.map((b) =>
              b.id === id ? { ...b, style: { ...b.style, width: newWidth, height: newHeight } } : b
            ),
            isDirty: true,
          };
        }

        const oldWidth = block.style.width;
        const oldHeight = block.style.height;

        // Calculate scale factors
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Helper function to scale a block and its nested children recursively
        const scaleBlock = (child: Block): Block => {
          const scaledStyle: BlockStyle = {
            ...child.style,
            x: child.style.x * scaleX,
            y: child.style.y * scaleY,
            width: child.style.width * scaleX,
            height: child.style.height * scaleY,
          };

          // Scale style properties that should scale proportionally
          // Use average scale for properties like fontSize, padding, border
          const avgScale = (scaleX + scaleY) / 2;

          if (child.style.fontSize !== undefined) {
            scaledStyle.fontSize = Math.max(6, child.style.fontSize * avgScale);
          }
          if (child.style.paddingTop !== undefined) {
            scaledStyle.paddingTop = child.style.paddingTop * avgScale;
          }
          if (child.style.paddingBottom !== undefined) {
            scaledStyle.paddingBottom = child.style.paddingBottom * avgScale;
          }
          if (child.style.paddingLeft !== undefined) {
            scaledStyle.paddingLeft = child.style.paddingLeft * scaleX;
          }
          if (child.style.paddingRight !== undefined) {
            scaledStyle.paddingRight = child.style.paddingRight * scaleX;
          }
          if (child.style.borderWidth !== undefined) {
            scaledStyle.borderWidth = Math.max(1, child.style.borderWidth * avgScale);
          }
          if (child.style.borderRadius !== undefined) {
            scaledStyle.borderRadius = child.style.borderRadius * avgScale;
          }

          // Handle nested containers recursively
          if (child.type === "container") {
            const childProps = child.properties as { children?: Block[] };
            const nestedChildren = childProps.children || [];
            if (nestedChildren.length > 0) {
              return {
                ...child,
                style: scaledStyle,
                properties: {
                  ...child.properties,
                  children: nestedChildren.map(scaleBlock),
                },
              };
            }
          }

          return {
            ...child,
            style: scaledStyle,
          };
        };

        // Scale all children
        const scaledChildren = children.map(scaleBlock);

        return {
          blocks: state.blocks.map((b) =>
            b.id === id
              ? {
                  ...b,
                  style: { ...b.style, width: newWidth, height: newHeight },
                  properties: { ...b.properties, children: scaledChildren },
                }
              : b
          ),
          isDirty: true,
        };
      }),

    removeBlock: (id) =>
      set((state) => ({
        ...pushHistory(state),
        blocks: state.blocks.filter((block) => block.id !== id),
        selectedBlockId:
          state.selectedBlockId === id ? null : state.selectedBlockId,
        selectedBlockIds: state.selectedBlockIds.filter((bid) => bid !== id),
        isDirty: true,
      })),

    removeSelectedBlocks: () =>
      set((state) => {
        if (state.selectedBlockIds.length === 0) return state;
        return {
          ...pushHistory(state),
          blocks: state.blocks.filter((block) => !state.selectedBlockIds.includes(block.id)),
          selectedBlockId: null,
          selectedBlockIds: [],
          isDirty: true,
        };
      }),

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
          ...pushHistory(state),
          blocks: [...state.blocks, newBlock],
          isDirty: true,
          selectedBlockId: newBlock.id,
          selectedBlockIds: [newBlock.id],
        };
      }),

    duplicateSelectedBlocks: () =>
      set((state) => {
        if (state.selectedBlockIds.length === 0) return state;

        const selectedBlocks = state.blocks.filter((b) => state.selectedBlockIds.includes(b.id));
        const newBlocks: Block[] = selectedBlocks.map((block) => ({
          ...JSON.parse(JSON.stringify(block)),
          id: generateId(),
          style: {
            ...block.style,
            x: block.style.x + 20,
            y: block.style.y + 20,
          },
        }));

        return {
          ...pushHistory(state),
          blocks: [...state.blocks, ...newBlocks],
          isDirty: true,
          selectedBlockId: newBlocks[0]?.id || null,
          selectedBlockIds: newBlocks.map((b) => b.id),
        };
      }),

    // Multi-select logic (no history push - selection is transient)
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

    selectAllBlocks: () =>
      set((state) => ({
        selectedBlockIds: state.blocks.map((b) => b.id),
        selectedBlockId: state.blocks[0]?.id || null,
      })),

    // Group logic
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
          const w = b.style.width ?? 0;
          const h = b.style.height ?? 0;

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
            children,
          },
          style: {
            ...DEFAULT_BLOCK_STYLE,
            x: containerX,
            y: containerY,
            width: containerWidth,
            height: containerHeight,
            backgroundColor: "transparent",
            paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "#ccc",
          }
        };

        // Remove original blocks and add container
        const newBlocks = state.blocks.filter(b => !state.selectedBlockIds.includes(b.id));
        return {
          ...pushHistory(state),
          blocks: [...newBlocks, containerBlock],
          selectedBlockIds: [containerId],
          selectedBlockId: containerId,
          isDirty: true,
        };
      }),

    // Ungroup logic
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
          const props = container.properties as { children?: Block[] };
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
          ...pushHistory(state),
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
        templateType: schema.templateType || "PAYROLL",
        recipientEmailField: schema.recipientEmailField || null,
        recipientNameField: schema.recipientNameField || null,
        guides: schema.guides || [],
        isDirty: false,
        selectedBlockId: null,
        selectedBlockIds: [],
        // Reset history when loading a new template
        history: [],
        historyIndex: -1,
      }),

    getSchema: () => {
      const state = get();
      return {
        blocks: state.blocks,
        variables: [],
        guides: state.guides,
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
            ...pushHistory(state),
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
          ...pushHistory(state),
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
        ...pushHistory(state),
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

    // Center entire selection on page
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
        ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
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
          ...pushHistory(state),
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, properties: { ...props, rows: newRows } }
              : b
          ),
          isDirty: true,
        };
      }),

    // Undo/Redo actions
    // Model: history[] stores states, historyIndex is current position
    // - pushHistory saves current state BEFORE a change happens
    // - historyIndex points to the last saved pre-change state
    // - After changes, current editor state differs from history[historyIndex]
    // - Undo restores history[historyIndex], saves current for redo
    // - Redo restores the next state after historyIndex
    undo: () =>
      set((state) => {
        if (state.historyIndex < 0) return state;

        // Save current state for redo (only if at tip of history)
        let newHistory = state.history;
        if (state.historyIndex === state.history.length - 1) {
          const currentSnapshot = createSnapshot(state);
          newHistory = [...state.history, currentSnapshot];
        }

        // Restore state at historyIndex
        const snapshot = newHistory[state.historyIndex];
        return {
          history: newHistory,
          historyIndex: state.historyIndex - 1,
          blocks: snapshot.blocks,
          globalStyles: snapshot.globalStyles,
          paperSize: snapshot.paperSize,
          orientation: snapshot.orientation,
          templateName: snapshot.templateName,
          isDirty: true,
        };
      }),

    redo: () =>
      set((state) => {
        // After undo, historyIndex points before the state we came from
        // So historyIndex + 1 is what we undid FROM, and historyIndex + 2 is where we want to go
        const targetIndex = state.historyIndex + 2;
        if (targetIndex >= state.history.length) return state;

        const snapshot = state.history[targetIndex];
        return {
          historyIndex: state.historyIndex + 1,
          blocks: snapshot.blocks,
          globalStyles: snapshot.globalStyles,
          paperSize: snapshot.paperSize,
          orientation: snapshot.orientation,
          templateName: snapshot.templateName,
          isDirty: true,
        };
      }),

    canUndo: () => {
      const state = get();
      return state.historyIndex >= 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex + 2 < state.history.length;
    },

    // Zoom actions
    setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),

    zoomIn: () =>
      set((state) => ({
        zoom: Math.min(2, state.zoom + 0.1),
      })),

    zoomOut: () =>
      set((state) => ({
        zoom: Math.max(0.25, state.zoom - 0.1),
      })),

    zoomToFit: () => set({ zoom: 1 }), // Simple implementation - reset to 100%

    resetZoom: () => set({ zoom: 1 }),

    // Copy/Paste actions
    copySelectedBlocks: () =>
      set((state) => {
        if (state.selectedBlockIds.length === 0) return state;
        const selectedBlocks = state.blocks.filter((b) => state.selectedBlockIds.includes(b.id));
        return {
          clipboard: JSON.parse(JSON.stringify(selectedBlocks)),
        };
      }),

    pasteBlocks: () =>
      set((state) => {
        if (!state.clipboard || state.clipboard.length === 0) return state;

        const newBlocks: Block[] = state.clipboard.map((block) => ({
          ...JSON.parse(JSON.stringify(block)),
          id: generateId(),
          style: {
            ...block.style,
            x: block.style.x + 20,
            y: block.style.y + 20,
          },
        }));

        return {
          ...pushHistory(state),
          blocks: [...state.blocks, ...newBlocks],
          selectedBlockIds: newBlocks.map((b) => b.id),
          selectedBlockId: newBlocks[0]?.id || null,
          isDirty: true,
        };
      }),

    // Nudge actions
    nudgeSelectedBlocks: (dx, dy) =>
      set((state) => {
        if (state.selectedBlockIds.length === 0) return state;

        return {
          ...pushHistory(state),
          blocks: state.blocks.map((block) =>
            state.selectedBlockIds.includes(block.id)
              ? {
                ...block,
                style: {
                  ...block.style,
                  x: Math.max(0, block.style.x + dx),
                  y: Math.max(0, block.style.y + dy),
                },
              }
              : block
          ),
          isDirty: true,
        };
      }),

    pushHistorySnapshot: () =>
      set((state) => ({
        ...pushHistory(state),
      })),

    // Guide actions
    addGuide: (orientation, position) =>
      set((state) => ({
        guides: [
          ...state.guides,
          { id: generateId(), orientation, position },
        ],
        isDirty: true,
      })),

    updateGuide: (id, position) =>
      set((state) => ({
        guides: state.guides.map((guide) =>
          guide.id === id ? { ...guide, position } : guide
        ),
        isDirty: true,
      })),

    removeGuide: (id) =>
      set((state) => ({
        guides: state.guides.filter((guide) => guide.id !== id),
        isDirty: true,
      })),

    clearGuides: () =>
      set({
        guides: [],
        isDirty: true,
      }),

    // Canvas display actions
    setShowRulers: (show) => set({ showRulers: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setGridSize: (size) => set({ gridSize: size }),
    setSnapToGrid: (snap) => set({ snapToGrid: snap }),

    // Panel visibility actions
    setShowLeftPanel: (show) => set({ showLeftPanel: show }),
    setShowRightPanel: (show) => set({ showRightPanel: show }),
    toggleLeftPanel: () => set((state) => ({ showLeftPanel: !state.showLeftPanel })),
    toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
  })
);

// Auto-save to localStorage when changes are made (debounced)
if (typeof window !== "undefined") {
  let saveTimeout: NodeJS.Timeout | null = null;
  const AUTO_SAVE_DELAY = 1000; // Save 1 second after last change

  useTemplateBuilderStore.subscribe((state, prevState) => {
    // Only save if there's a template loaded and changes were made
    if (!state.templateId || !state.isDirty) return;

    // Skip if only transient state changed (selection, zoom, panels, etc.)
    const contentChanged =
      state.blocks !== prevState.blocks ||
      state.globalStyles !== prevState.globalStyles ||
      state.templateName !== prevState.templateName ||
      state.paperSize !== prevState.paperSize ||
      state.orientation !== prevState.orientation ||
      state.guides !== prevState.guides;

    if (!contentChanged) return;

    // Debounce the save
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      import("@/lib/draft").then(({ saveDraft }) => {
        saveDraft({
          templateId: state.templateId!,
          templateName: state.templateName,
          blocks: state.blocks,
          globalStyles: state.globalStyles,
          paperSize: state.paperSize,
          orientation: state.orientation,
          guides: state.guides,
        });
      });
    }, AUTO_SAVE_DELAY);
  });
}
