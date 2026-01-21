"use client";

import { BlockType } from "@/types/template";
import {
  Type,
  Table2,
  Image,
  LayoutGrid,
  Minus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    type: "container",
    label: "Container",
    icon: LayoutGrid,
    description: "Group elements",
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

function DraggableBlock({ item }: { item: BlockItem }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("blockType", item.type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex cursor-grab items-center gap-3 rounded-md border bg-background p-3 transition-all hover:border-primary hover:shadow-sm active:cursor-grabbing"
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
    </div>
  );
}

export function BlockPalette() {
  return (
    <div className="w-64 border-r bg-muted/30 overflow-y-auto flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Elements</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Drag elements to the canvas
        </p>
      </div>
      <div className="p-3 space-y-2 flex-1">
        {blockItems.map((item) => (
          <DraggableBlock key={item.type} item={item} />
        ))}
      </div>
    </div>
  );
}
