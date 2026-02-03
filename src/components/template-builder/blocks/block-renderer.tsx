"use client";

import { Block } from "@/types/template";
import { TextBlock } from "./text-block";
import { TableBlock } from "./table-block";
import { ImageBlock } from "./image-block";
import { ContainerBlock } from "./container-block";
import { DividerBlock } from "./divider-block";
import { SpacerBlock } from "./spacer-block";

interface BlockRendererProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function BlockRenderer({ block, isPreview = false, data }: BlockRendererProps) {
  // Style for the block content (excluding position/size which is handled by canvas)
  // Table blocks need overflow:visible for add row/column buttons to extend outside
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    paddingTop: block.style.paddingTop,
    paddingBottom: block.style.paddingBottom,
    paddingLeft: block.style.paddingLeft,
    paddingRight: block.style.paddingRight,
    fontSize: block.style.fontSize,
    fontWeight: block.style.fontWeight,
    textAlign: block.style.textAlign,
    color: block.style.color,
    backgroundColor: block.style.backgroundColor,
    borderWidth: block.style.borderWidth,
    borderColor: block.style.borderColor,
    borderStyle: block.style.borderStyle,
    borderRadius: block.style.borderRadius,
    lineHeight: block.style.lineHeight,
    overflow: block.type === "table" ? "visible" : "hidden",
  };

  const props = { block, isPreview, data };

  const content = (() => {
    switch (block.type) {
      case "text":
        return <TextBlock {...props} />;
      case "table":
        return <TableBlock {...props} />;
      case "image":
        return <ImageBlock {...props} />;
      case "container":
        return <ContainerBlock {...props} />;
      case "divider":
        return <DividerBlock {...props} />;
      case "spacer":
        return <SpacerBlock {...props} />;
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Unknown block type: {block.type}
          </div>
        );
    }
  })();

  return <div style={style}>{content}</div>;
}
