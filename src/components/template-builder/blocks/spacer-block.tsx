"use client";

import { Block, SpacerBlockProperties } from "@/types/template";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";

interface SpacerBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function SpacerBlock({ block, isPreview }: SpacerBlockProps) {
  const props = block.properties as SpacerBlockProperties;
  const { selectedBlockId } = useTemplateBuilderStore();
  const isSelected = selectedBlockId === block.id;

  return (
    <div
      style={{ height: props.height || 24 }}
      className={
        !isPreview && isSelected
          ? "bg-muted/30 border border-dashed border-muted-foreground/20 rounded"
          : ""
      }
    />
  );
}
