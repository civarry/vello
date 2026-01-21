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

const blockConfig: Record<BlockType, { label: string; icon: React.ElementType }> = {
  text: { label: "Text", icon: Type },
  table: { label: "Table", icon: Table2 },
  image: { label: "Image", icon: Image },
  container: { label: "Container", icon: LayoutGrid },
  divider: { label: "Divider", icon: Minus },
  spacer: { label: "Spacer", icon: Square },
};

interface BlockPreviewProps {
  type: BlockType;
}

export function BlockPreview({ type }: BlockPreviewProps) {
  const config = blockConfig[type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3 shadow-lg">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
