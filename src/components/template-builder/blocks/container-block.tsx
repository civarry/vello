"use client";

import { Block, ContainerBlockProperties } from "@/types/template";
import { LayoutGrid } from "lucide-react";

interface ContainerBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function ContainerBlock({ block }: ContainerBlockProps) {
  const props = block.properties as ContainerBlockProperties;

  const justifyMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
  };

  const alignMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };

  // Container is a placeholder for now - nested blocks would require more complex implementation
  return (
    <div
      className="flex border-2 border-dashed border-muted-foreground/20 rounded min-h-[60px] items-center justify-center"
      style={{
        flexDirection: props.direction || "row",
        gap: props.gap || 8,
        justifyContent: justifyMap[props.justifyContent || "start"],
        alignItems: alignMap[props.alignItems || "start"],
      }}
    >
      <div className="flex flex-col items-center text-muted-foreground/50 text-xs">
        <LayoutGrid className="h-6 w-6 mb-1" />
        <span>Container</span>
        <span className="text-[10px]">(Drag elements here)</span>
      </div>
    </div>
  );
}
