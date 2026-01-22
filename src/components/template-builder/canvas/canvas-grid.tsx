"use client";

import type { GridSize } from "@/stores/template-builder-store";

interface CanvasGridProps {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: GridSize;
  zoom: number;
}

export function CanvasGrid({ canvasWidth, canvasHeight, gridSize, zoom }: CanvasGridProps) {
  const scaledGridSize = gridSize * zoom;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      width={canvasWidth * zoom}
      height={canvasHeight * zoom}
    >
      <defs>
        <pattern
          id={`grid-${gridSize}`}
          width={scaledGridSize}
          height={scaledGridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/20"
          />
        </pattern>
        {/* Major grid lines every 5 cells */}
        <pattern
          id={`grid-major-${gridSize}`}
          width={scaledGridSize * 5}
          height={scaledGridSize * 5}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scaledGridSize * 5} 0 L 0 0 0 ${scaledGridSize * 5}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground/30"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#grid-${gridSize})`} />
      <rect width="100%" height="100%" fill={`url(#grid-major-${gridSize})`} />
    </svg>
  );
}
