"use client";

import { Block, ContainerBlockProperties } from "@/types/template";
import { LayoutGrid } from "lucide-react";
import { BlockRenderer } from "./block-renderer";

interface ContainerBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function ContainerBlock({ block, isPreview, data }: ContainerBlockProps) {
  const props = block.properties as ContainerBlockProperties;
  const hasChildren = props.children && props.children.length > 0;

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

  if (hasChildren) {
    return (
      <div
        className="w-full h-full relative"
        style={{
          // We can still support flex properties if the user wants to use them for layout,
          // but for "Group" functionality, children have absolute positions.
          // If we mix them, absolute children ignore flex.
          // So this is safe.
        }}
      >
        {props.children!.map((child) => (
          <div
            key={child.id}
            style={{
              position: "absolute",
              left: child.style.x,
              top: child.style.y,
              width: child.style.width,
              height: child.style.height,
              zIndex: 1, // Ensure children are above container background
            }}
          >
            <BlockRenderer block={child} isPreview={isPreview} data={data} />
          </div>
        ))}
      </div>
    );
  }

  // Container is a placeholder if empty
  return (
    <div
      className="flex border-2 border-dashed border-muted-foreground/20 rounded min-h-[60px] items-center justify-center h-full"
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
