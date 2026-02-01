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
  const RULER_SIZE = 24;

  // Dynamic tick intervals based on zoom level for readability
  // At low zoom, we need larger intervals so numbers don't overlap
  const getTickIntervals = (currentZoom: number) => {
    if (currentZoom >= 0.75) {
      // Normal: every 50px with labels
      return { major: 50, minor: 10 };
    } else if (currentZoom >= 0.5) {
      // Medium zoom: every 100px with labels
      return { major: 100, minor: 50 };
    } else if (currentZoom >= 0.35) {
      // Low zoom: every 200px with labels
      return { major: 200, minor: 100 };
    } else {
      // Very low zoom (mobile): every 500px with labels
      return { major: 500, minor: 100 };
    }
  };

  const { major: MAJOR_TICK_INTERVAL, minor: MINOR_TICK_INTERVAL } = getTickIntervals(zoom);

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
        className="absolute bottom-0"
        style={{ left: i * zoom }}
      >
        {isMajor && (
          <span className="absolute bottom-2.5 left-0.5 text-[9px] leading-none text-muted-foreground select-none">
            {i}
          </span>
        )}
        <div
          className={cn(
            "absolute bottom-0 bg-muted-foreground/50",
            isMajor ? "h-2 w-px" : "h-1 w-px"
          )}
        />
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
        className="absolute right-0"
        style={{ top: i * zoom }}
      >
        {isMajor && (
          <span
            className="absolute right-2.5 -top-2 text-[9px] leading-none text-muted-foreground select-none"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
          >
            {i}
          </span>
        )}
        <div
          className={cn(
            "absolute right-0 bg-muted-foreground/50",
            isMajor ? "w-2 h-px" : "w-1 h-px"
          )}
        />
      </div>
    );
  }

  return (
    <>
      {/* Horizontal ruler (top) */}
      <div
        className="absolute bg-muted border-b cursor-pointer hover:bg-muted/80 transition-colors z-20 overflow-hidden"
        style={{
          top: 0,
          left: RULER_SIZE,
          width: canvasWidth * zoom,
          height: RULER_SIZE,
        }}
        onClick={handleHorizontalRulerClick}
        title="Click to add vertical guide"
      >
        <div className="relative w-full h-full">
          {horizontalTicks}
        </div>
      </div>

      {/* Vertical ruler (left) */}
      <div
        className="absolute bg-muted border-r cursor-pointer hover:bg-muted/80 transition-colors z-20 overflow-hidden"
        style={{
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          height: canvasHeight * zoom,
        }}
        onClick={handleVerticalRulerClick}
        title="Click to add horizontal guide"
      >
        <div className="relative w-full h-full">
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
