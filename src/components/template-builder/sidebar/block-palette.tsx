"use client";

import { BlockType } from "@/types/template";
import {
  Type,
  Table2,
  Image,
  Minus,
  Square,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplateBuilderStore, PAPER_DIMENSIONS } from "@/stores/template-builder-store";
import { DEFAULT_BLOCK_SIZES } from "@/types/template";
import { useIsDesktop } from "@/hooks/use-media-query";

interface BlockItem {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const blockItems: BlockItem[] = [
  {
    type: "text",
    label: "Text",
    icon: Type,
    description: "Headings, paragraphs, labels",
  },
  {
    type: "table",
    label: "Table",
    icon: Table2,
    description: "Data with label & value columns",
  },
  {
    type: "image",
    label: "Image",
    icon: Image,
    description: "Logo or images",
  },
  {
    type: "divider",
    label: "Divider",
    icon: Minus,
    description: "Horizontal line",
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: Square,
    description: "Empty space",
  },
];

function DraggableBlock({ item, isDesktop }: { item: BlockItem; isDesktop: boolean }) {
  const { addBlockAtPosition, blocks, paperSize, orientation } = useTemplateBuilderStore();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("blockType", item.type);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Tap-to-add for mobile: add block at a smart position
  const handleTapToAdd = () => {
    if (isDesktop) return; // On desktop, rely on drag instead

    // Calculate paper dimensions
    const dimensions = PAPER_DIMENSIONS[paperSize];
    const pxPerMm = 3.78;
    const canvasWidth = (orientation === "PORTRAIT" ? dimensions.width : dimensions.height) * pxPerMm;

    // Get default size for this block type
    const sizes = DEFAULT_BLOCK_SIZES[item.type];

    // Calculate vertical position based on existing blocks
    // Stack new blocks below the lowest existing block
    let yPosition = 20; // Default start position
    if (blocks.length > 0) {
      const lowestY = Math.max(...blocks.map(b => b.style.y + b.style.height));
      yPosition = lowestY + 20; // 20px gap after lowest block
    }

    // Center horizontally
    const xPosition = (canvasWidth - sizes.width) / 2;

    addBlockAtPosition(item.type, xPosition, yPosition);
  };

  return (
    <div
      draggable={isDesktop}
      onDragStart={isDesktop ? handleDragStart : undefined}
      onClick={handleTapToAdd}
      className={cn(
        "flex items-center gap-3 rounded-md border bg-background p-3 transition-all hover:border-primary hover:shadow-sm",
        isDesktop ? "cursor-grab active:cursor-grabbing" : "cursor-pointer active:bg-muted"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
        <item.icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {item.description}
        </p>
      </div>
      {/* Show add indicator on mobile */}
      {!isDesktop && (
        <Plus className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function BlockPalette() {
  const isDesktop = useIsDesktop();

  return (
    <div className="w-full bg-muted/30 overflow-y-auto flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Elements</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isDesktop ? "Drag elements to the canvas" : "Tap to add elements"}
        </p>
      </div>
      <div className="p-3 space-y-2 flex-1">
        {blockItems.map((item) => (
          <DraggableBlock key={item.type} item={item} isDesktop={isDesktop} />
        ))}
      </div>
    </div>
  );
}
