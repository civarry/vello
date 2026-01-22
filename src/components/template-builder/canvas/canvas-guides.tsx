"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Guide } from "@/types/template";

interface CanvasGuidesProps {
  guides: Guide[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  onUpdateGuide: (id: string, position: number) => void;
  onRemoveGuide: (id: string) => void;
}

export function CanvasGuides({
  guides,
  canvasWidth,
  canvasHeight,
  zoom,
  onUpdateGuide,
  onRemoveGuide,
}: CanvasGuidesProps) {
  const [draggingGuide, setDraggingGuide] = useState<string | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, guide: Guide) => {
      e.stopPropagation();
      setDraggingGuide(guide.id);

      const startPos = guide.orientation === "vertical" ? e.clientX : e.clientY;
      const startGuidePos = guide.position;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos =
          guide.orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = (currentPos - startPos) / zoom;
        const newPosition = Math.max(0, startGuidePos + delta);

        // Clamp to canvas bounds
        const maxPos =
          guide.orientation === "vertical" ? canvasWidth : canvasHeight;
        const clampedPosition = Math.min(maxPos, newPosition);

        onUpdateGuide(guide.id, clampedPosition);
      };

      const handleMouseUp = () => {
        setDraggingGuide(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [zoom, canvasWidth, canvasHeight, onUpdateGuide]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, guideId: string) => {
      e.stopPropagation();
      onRemoveGuide(guideId);
    },
    [onRemoveGuide]
  );

  return (
    <>
      {guides.map((guide) => (
        <div
          key={guide.id}
          className={cn(
            "absolute z-30 group",
            guide.orientation === "vertical"
              ? "w-px h-full cursor-ew-resize"
              : "h-px w-full cursor-ns-resize",
            draggingGuide === guide.id
              ? "bg-primary"
              : "bg-cyan-500 hover:bg-primary"
          )}
          style={
            guide.orientation === "vertical"
              ? { left: guide.position * zoom, top: 0 }
              : { top: guide.position * zoom, left: 0 }
          }
          onMouseDown={(e) => handleMouseDown(e, guide)}
          onDoubleClick={(e) => handleDoubleClick(e, guide.id)}
          title="Drag to move, double-click to remove"
        >
          {/* Wider hit area for easier grabbing */}
          <div
            className={cn(
              "absolute bg-transparent",
              guide.orientation === "vertical"
                ? "w-3 h-full -left-1"
                : "h-3 w-full -top-1"
            )}
          />

          {/* Position indicator on hover/drag */}
          <div
            className={cn(
              "absolute bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity",
              draggingGuide === guide.id && "opacity-100",
              guide.orientation === "vertical"
                ? "top-1 left-2"
                : "left-1 top-2"
            )}
          >
            {Math.round(guide.position)}px
          </div>
        </div>
      ))}
    </>
  );
}
