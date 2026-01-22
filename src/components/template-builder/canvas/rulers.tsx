"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface RulersProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  onAddGuide: (orientation: "horizontal" | "vertical", position: number) => void;
}

export function Rulers({ canvasWidth, canvasHeight, zoom, onAddGuide }: RulersProps) {
  const RULER_SIZE = 20;
  const MAJOR_TICK_INTERVAL = 50; // pixels
  const MINOR_TICK_INTERVAL = 10; // pixels

  const handleHorizontalRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      onAddGuide("vertical", x);
    },
    [zoom, onAddGuide]
  );

  const handleVerticalRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = (e.clientY - rect.top) / zoom;
      onAddGuide("horizontal", y);
    },
    [zoom, onAddGuide]
  );

  // Generate tick marks for horizontal ruler
  const horizontalTicks = [];
  for (let i = 0; i <= canvasWidth; i += MINOR_TICK_INTERVAL) {
    const isMajor = i % MAJOR_TICK_INTERVAL === 0;
    horizontalTicks.push(
      <div
        key={`h-${i}`}
        className="absolute top-0"
        style={{ left: i * zoom }}
      >
        <div
          className={cn(
            "bg-muted-foreground/50",
            isMajor ? "h-3 w-px" : "h-1.5 w-px"
          )}
        />
        {isMajor && (
          <span className="absolute top-3 left-0.5 text-[8px] text-muted-foreground select-none">
            {i}
          </span>
        )}
      </div>
    );
  }

  // Generate tick marks for vertical ruler
  const verticalTicks = [];
  for (let i = 0; i <= canvasHeight; i += MINOR_TICK_INTERVAL) {
    const isMajor = i % MAJOR_TICK_INTERVAL === 0;
    verticalTicks.push(
      <div
        key={`v-${i}`}
        className="absolute left-0"
        style={{ top: i * zoom }}
      >
        <div
          className={cn(
            "bg-muted-foreground/50",
            isMajor ? "w-3 h-px" : "w-1.5 h-px"
          )}
        />
        {isMajor && (
          <span
            className="absolute left-3.5 -top-1.5 text-[8px] text-muted-foreground select-none"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
          >
            {i}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Horizontal ruler (top) */}
      <div
        className="absolute bg-muted border-b cursor-pointer hover:bg-muted/80 transition-colors z-20"
        style={{
          top: 0,
          left: RULER_SIZE,
          width: canvasWidth * zoom,
          height: RULER_SIZE,
        }}
        onClick={handleHorizontalRulerClick}
        title="Click to add vertical guide"
      >
        <div className="relative w-full h-full overflow-hidden">
          {horizontalTicks}
        </div>
      </div>

      {/* Vertical ruler (left) */}
      <div
        className="absolute bg-muted border-r cursor-pointer hover:bg-muted/80 transition-colors z-20"
        style={{
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          height: canvasHeight * zoom,
        }}
        onClick={handleVerticalRulerClick}
        title="Click to add horizontal guide"
      >
        <div className="relative w-full h-full overflow-hidden">
          {verticalTicks}
        </div>
      </div>

      {/* Corner square */}
      <div
        className="absolute bg-muted border-r border-b z-20"
        style={{
          top: 0,
          left: 0,
          width: RULER_SIZE,
          height: RULER_SIZE,
        }}
      />
    </>
  );
}
