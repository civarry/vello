"use client";

import { Block, DividerBlockProperties } from "@/types/template";

interface DividerBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function DividerBlock({ block }: DividerBlockProps) {
  const props = block.properties as DividerBlockProperties;

  return (
    <hr
      style={{
        borderTopWidth: props.thickness || 1,
        borderColor: props.color || "#e5e7eb",
        borderStyle: props.style || "solid",
        margin: 0,
      }}
    />
  );
}
