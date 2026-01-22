"use client";

import { useState, useRef, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  useTemplateBuilderStore,
  PAPER_DIMENSIONS,
} from "@/stores/template-builder-store";
import { Block, BlockType, DEFAULT_BLOCK_SIZES } from "@/types/template";
import { BlockRenderer } from "../blocks/block-renderer";
import { cn } from "@/lib/utils";
import { Trash2, Copy, Move, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine, AlignCenterVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

// Guide line type
type Guide = {
  orientation: "vertical" | "horizontal";
  position: number;
};

interface DraggableBlockProps {
  block: Block;
  scale: number;
  otherBlocks: Block[];
  canvasWidth: number;
  canvasHeight: number;
  setGuides: (guides: Guide[]) => void;
  showToolbar: boolean;
}

function DraggableBlock({ block, scale, otherBlocks, canvasWidth, canvasHeight, setGuides, showToolbar }: DraggableBlockProps) {
  const {
    selectedBlockIds,
    selectBlock,
    removeBlock,
    duplicateBlock,
    updateBlockPosition,
    updateBlockPositions,
    updateBlockSize,
    alignBlock,
    blocks, // Need access to all blocks to find selected ones for drag
  } = useTemplateBuilderStore();

  const isSelected = selectedBlockIds.includes(block.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    initialPositions: Map<string, { x: number; y: number }>
  } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; blockX: number; blockY: number } | null>(null);

  const SNAP_THRESHOLD = 5;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const target = e.target as HTMLElement;

    // Don't change selection when clicking on toolbar buttons
    if (target.closest('[data-block-toolbar]')) return;

    // Don't start drag when clicking on resize handles
    if (target.closest('[data-resize-handle]')) {
      selectBlock(block.id, e.shiftKey);
      return;
    }

    // Multi-select logic is handled by store action
    selectBlock(block.id, e.shiftKey);

    setIsDragging(true);

    // Capture initial positions of currently selected blocks (including the one just clicked)
    // Note: State update for selection might not be immediate, so we calculate what SHOULD be selected
    // OR we rely on the fact that we just called selectBlock. 
    // Actually, reading from 'blocks' from store might be stale or 'selectedBlockIds' stale in this closure.
    // Ideally we use a ref or effect, but for drag start we need snapshots.
    // Let's assume for now we drag the current block + others if they were already selected.

    // Better interaction: If I click an unselected block without shift, it becomes the ONLY selection.
    // If I click a selected block, I drag the group.

    // We can't easily access the *updated* selection state immediately after selectBlock call.
    // However, if we are clicking a block:
    // 1. If Shift is down, toggle selection.
    // 2. If Shift is UP:
    //    a. If block is ALREADY selected, keep selection (might be starting a drag of the group).
    //    b. If block is NOT selected, select ONLY this block.

    // Let's refine the selectBlock call above.
    // If we want to drag a group, we shouldn't deselect others when clicking a member.
    // But duplicate logic in store?
    // Let's rely on store 'selectBlock' doing the right thing, but we need to know what to drag.

    // Hack: We need the list of IDs to drag.
    let draggingIds: string[] = [];
    if (e.shiftKey) {
      // Toggling. If we just added it, it's dragging. If removed, we probably shouldn't drag it?
      // Actually typically you don't drag on the same click as shift-select.
      // But let's support it. 
      // For simplicity, let's look at `selectedBlockIds`. 
      // If currently selected, stay selected.
      draggingIds = [...selectedBlockIds];
      if (!draggingIds.includes(block.id)) draggingIds.push(block.id);
    } else {
      if (selectedBlockIds.includes(block.id)) {
        // Already selected, drag all
        draggingIds = [...selectedBlockIds];
      } else {
        // New single selection
        draggingIds = [block.id];
      }
    }

    const initialPositions = new Map<string, { x: number; y: number }>();
    useTemplateBuilderStore.getState().blocks.forEach(b => {
      if (draggingIds.includes(b.id)) {
        initialPositions.set(b.id, { x: b.style.x, y: b.style.y });
      }
    });

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPositions,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;

      // Primary block (this block) logic for snapping
      const initialPos = dragStartRef.current.initialPositions.get(block.id);
      if (!initialPos) return; // Should not happen

      let newX = initialPos.x + dx;
      let newY = initialPos.y + dy;

      const activeGuides: Guide[] = [];

      // SNAPPING LOGIC (Only for the primary dragged block for now)
      const blockWidth = block.style.width;
      const blockHeight = block.style.height;
      const myPointsX = [newX, newX + blockWidth / 2, newX + blockWidth];
      const myPointsY = [newY, newY + blockHeight / 2, newY + blockHeight];
      const targetsX = [canvasWidth / 2];
      const targetsY = [canvasHeight / 2];

      otherBlocks.forEach(other => {
        // Don't snap to other dragging blocks
        if (dragStartRef.current?.initialPositions.has(other.id)) return;
        targetsX.push(other.style.x, other.style.x + other.style.width / 2, other.style.x + other.style.width);
        targetsY.push(other.style.y, other.style.y + other.style.height / 2, other.style.y + other.style.height);
      });

      // Check X Snapping
      let snapX = null;
      let minDistX = SNAP_THRESHOLD;
      for (let i = 0; i < myPointsX.length; i++) {
        const myX = myPointsX[i];
        for (const targetX of targetsX) {
          const diff = Math.abs(myX - targetX);
          if (diff < minDistX) {
            minDistX = diff;
            if (i === 0) snapX = targetX;
            else if (i === 1) snapX = targetX - blockWidth / 2;
            else if (i === 2) snapX = targetX - blockWidth;
          }
        }
      }

      // Apply X Snap
      let snapedDx = dx;
      if (snapX !== null) {
        newX = snapX;
        snapedDx = newX - initialPos.x; // Recalculate dx based on snap

        // Guides
        const snappedCenter = newX + blockWidth / 2;
        const snappedRight = newX + blockWidth;
        if (targetsX.some(t => Math.abs(newX - t) < 0.1)) activeGuides.push({ orientation: "vertical", position: newX });
        else if (targetsX.some(t => Math.abs(snappedCenter - t) < 0.1)) activeGuides.push({ orientation: "vertical", position: snappedCenter });
        else if (targetsX.some(t => Math.abs(snappedRight - t) < 0.1)) activeGuides.push({ orientation: "vertical", position: snappedRight });
      }

      // Check Y Snapping
      let snapY = null;
      let minDistY = SNAP_THRESHOLD;
      for (let i = 0; i < myPointsY.length; i++) {
        const myY = myPointsY[i];
        for (const targetY of targetsY) {
          const diff = Math.abs(myY - targetY);
          if (diff < minDistY) {
            minDistY = diff;
            if (i === 0) snapY = targetY;
            else if (i === 1) snapY = targetY - blockHeight / 2;
            else if (i === 2) snapY = targetY - blockHeight;
          }
        }
      }

      // Apply Y Snap
      let snapedDy = dy;
      if (snapY !== null) {
        newY = snapY;
        snapedDy = newY - initialPos.y; // Recalculate dy based on snap

        // Guides
        const snappedCenter = newY + blockHeight / 2;
        const snappedBottom = newY + blockHeight;
        if (targetsY.some(t => Math.abs(newY - t) < 0.1)) activeGuides.push({ orientation: "horizontal", position: newY });
        else if (targetsY.some(t => Math.abs(snappedCenter - t) < 0.1)) activeGuides.push({ orientation: "horizontal", position: snappedCenter });
        else if (targetsY.some(t => Math.abs(snappedBottom - t) < 0.1)) activeGuides.push({ orientation: "horizontal", position: snappedBottom });
      }

      setGuides(activeGuides);

      // Apply calculated delta (snapedDx, snapedDy) to ALL dragging blocks
      const updates = new Map<string, { x: number; y: number }>();
      dragStartRef.current.initialPositions.forEach((pos, id) => {
        updates.set(id, {
          x: Math.max(0, pos.x + snapedDx),
          y: Math.max(0, pos.y + snapedDy),
        });
      });

      updateBlockPositions(updates);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      setGuides([]); // Clear guides
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [block.id, block.style, scale, selectedBlockIds, selectBlock, updateBlockPositions, otherBlocks, canvasWidth, canvasHeight, setGuides]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    // ... (Resize Logic - keep existing, maybe add guides later but simplifying for now)
    e.stopPropagation();
    e.preventDefault();
    selectBlock(block.id);
    setIsResizing(true);
    setResizeHandle(handle);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: block.style.width,
      height: block.style.height,
      blockX: block.style.x,
      blockY: block.style.y,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = (e.clientX - resizeStartRef.current.x) / scale;
      const dy = (e.clientY - resizeStartRef.current.y) / scale;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = resizeStartRef.current.blockX;
      let newY = resizeStartRef.current.blockY;

      if (handle.includes("e")) newWidth = Math.max(50, resizeStartRef.current.width + dx);
      if (handle.includes("w")) {
        newWidth = Math.max(50, resizeStartRef.current.width - dx);
        newX = resizeStartRef.current.blockX + dx;
      }
      if (handle.includes("s")) newHeight = Math.max(20, resizeStartRef.current.height + dy);
      if (handle.includes("n")) {
        newHeight = Math.max(20, resizeStartRef.current.height - dy);
        newY = resizeStartRef.current.blockY + dy;
      }

      updateBlockSize(block.id, newWidth, newHeight);
      if (handle.includes("w") || handle.includes("n")) {
        updateBlockPosition(block.id, Math.max(0, newX), Math.max(0, newY));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      resizeStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [block.id, block.style, scale, selectBlock, updateBlockPosition, updateBlockSize]);

  const resizeHandles = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];

  return (
    <div
      className={cn(
        "absolute group",
        isSelected && "z-10",
        isDragging && "cursor-grabbing",
        !isDragging && "cursor-grab"
      )}
      style={{
        left: block.style.x,
        top: block.style.y,
        width: block.style.width,
        height: block.style.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Selection outline */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none border-2 rounded transition-colors",
          isSelected ? "border-primary" : "border-transparent group-hover:border-primary/30"
        )}
      />

      {/* Block content */}
      <div className="w-full h-full overflow-hidden">
        <BlockRenderer block={block} />
      </div>

      {/* Controls toolbar - show only on one block for selection */}
      {isSelected && showToolbar && (
        <div
          className="absolute -top-9 left-0 flex items-center gap-1 bg-background border rounded-md shadow-sm p-1"
          data-block-toolbar="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "left");
            }}
            title="Align left"
          >
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "center");
            }}
            title="Center horizontally"
          >
            <AlignCenter className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "right");
            }}
            title="Align right"
          >
            <AlignRight className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "top");
            }}
            title="Align top"
          >
            <ArrowUpToLine className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "middle");
            }}
            title="Center vertically"
          >
            <AlignCenterVertical className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              alignBlock(block.id, "bottom");
            }}
            title="Align bottom"
          >
            <ArrowDownToLine className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              duplicateBlock(block.id);
            }}
            title="Duplicate"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Resize handles - show on selection */}
      {isSelected && resizeHandles.map((handle) => (
        <div
          key={handle}
          data-resize-handle={handle}
          className={cn(
            "absolute w-3 h-3 bg-primary border border-background rounded-sm",
            handle === "n" && "left-1/2 -top-1.5 -translate-x-1/2 cursor-n-resize",
            handle === "e" && "top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize",
            handle === "s" && "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-s-resize",
            handle === "w" && "top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize",
            handle === "ne" && "-top-1.5 -right-1.5 cursor-ne-resize",
            handle === "se" && "-bottom-1.5 -right-1.5 cursor-se-resize",
            handle === "sw" && "-bottom-1.5 -left-1.5 cursor-sw-resize",
            handle === "nw" && "-top-1.5 -left-1.5 cursor-nw-resize"
          )}
          onMouseDown={(e) => handleResizeMouseDown(e, handle)}
        />
      ))}

      {/* Size indicator - show while resizing */}
      {(isResizing || isDragging) && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded whitespace-nowrap">
          {Math.round(block.style.width)} x {Math.round(block.style.height)}
        </div>
      )}
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, selectBlock, addBlockAtPosition, paperSize, orientation, selectedBlockIds } =
    useTemplateBuilderStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);

  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  const dimensions = PAPER_DIMENSIONS[paperSize];
  const canvasWidth = orientation === "PORTRAIT" ? dimensions.width : dimensions.height;
  const canvasHeight = orientation === "PORTRAIT" ? dimensions.height : dimensions.width;

  // Convert mm to pixels (approximately 3.78 px/mm at 96 DPI)
  const pxPerMm = 3.78;
  const canvasWidthPx = canvasWidth * pxPerMm;
  const canvasHeightPx = canvasHeight * pxPerMm;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas, not on a block
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
      selectBlock(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("blockType") as BlockType;
    if (!blockType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Center the block on the drop position
    const sizes = DEFAULT_BLOCK_SIZES[blockType];
    addBlockAtPosition(blockType, x - sizes.width / 2, y - sizes.height / 2);
  }, [scale, addBlockAtPosition]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      className="flex-1 overflow-auto bg-muted/50 p-8"
      onClick={() => selectBlock(null)}
    >
      <div
        ref={(node) => {
          setNodeRef(node);
          if (node) canvasRef.current = node;
        }}
        className={cn(
          "mx-auto bg-white shadow-lg rounded-sm transition-all relative",
          isOver && "ring-2 ring-primary ring-dashed"
        )}
        style={{
          width: canvasWidthPx,
          height: canvasHeightPx,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        data-canvas="true"
      >
        {blocks.length === 0 && (
          <div
            className="absolute inset-8 flex items-center justify-center border-2 border-dashed rounded-md pointer-events-none"
            data-canvas="true"
          >
            <p className="text-muted-foreground">
              Drag elements here to start building your template
            </p>
          </div>
        )}

        {/* Render Guides */}
        {guides.map((guide, i) => (
          <div
            key={i}
            className={cn(
              "absolute bg-red-500 z-50 pointer-events-none",
              guide.orientation === "vertical" ? "w-[1px] top-0 bottom-0" : "h-[1px] left-0 right-0"
            )}
            style={
              guide.orientation === "vertical"
                ? { left: guide.position }
                : { top: guide.position }
            }
          />
        ))}

        {blocks.map((block) => {
          // Show toolbar only on the first selected block
          const isFirstSelected = selectedBlockIds.length > 0 && selectedBlockIds[0] === block.id;
          return (
            <DraggableBlock
              key={block.id}
              block={block}
              scale={scale}
              // Pass filtered blocks (excluding current) for snapping
              otherBlocks={blocks.filter(b => b.id !== block.id)}
              canvasWidth={canvasWidthPx} // Using PX value for calculation
              canvasHeight={canvasHeightPx} // Using PX value for calculation
              setGuides={setGuides}
              showToolbar={isFirstSelected}
            />
          );
        })}
      </div>
    </div>
  );
}
