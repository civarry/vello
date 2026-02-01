"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Eye,
  Download,
  Loader2,
  RotateCcw,
  RotateCw,
  Minus,
  Plus,
  Maximize2,
  Ruler,
  Grid3X3,
  Magnet,
  Settings,
  FileText,
  MoreHorizontal,
  ZoomIn,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTemplateBuilderStore,
  PaperSize,
  Orientation,
  GridSize,
} from "@/stores/template-builder-store";
import { toast } from "sonner";

interface MobileBottomToolbarProps {
  onPreview: () => void;
  onExport: () => void;
  onSettings: () => void;
  isExporting: boolean;
}

export function MobileBottomToolbar({
  onPreview,
  onExport,
  onSettings,
  isExporting,
}: MobileBottomToolbarProps) {
  const {
    paperSize,
    setPaperSize,
    orientation,
    setOrientation,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize,
    snapToGrid,
    setSnapToGrid,
  } = useTemplateBuilderStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around gap-1">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo()}
            className="h-10 w-10"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo()}
            className="h-10 w-10"
          >
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Page Setup */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <FileText className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="center" side="top">
            <div className="space-y-3">
              <div className="text-sm font-medium">Page Setup</div>
              <div>
                <label className="text-xs text-muted-foreground">Paper Size</label>
                <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="LETTER">Letter</SelectItem>
                    <SelectItem value="LEGAL">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Orientation</label>
                <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORTRAIT">Portrait</SelectItem>
                    <SelectItem value="LANDSCAPE">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Zoom */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 px-2 tabular-nums gap-1">
              <ZoomIn className="h-5 w-5" />
              <span className="text-xs">{Math.round(zoom * 100)}%</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="center" side="top">
            <div className="space-y-3">
              <div className="text-sm font-medium">Zoom</div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={zoomOut}
                  disabled={zoom <= 0.25}
                  className="h-10 w-10"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium tabular-nums w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={zoomIn}
                  disabled={zoom >= 2}
                  className="h-10 w-10"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                className="w-full h-9"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Reset to 100%
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* View Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={(showRulers || showGrid) ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-48">
            <DropdownMenuLabel>Canvas Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showRulers}
              onCheckedChange={setShowRulers}
            >
              <Ruler className="h-4 w-4 mr-2" />
              Show Rulers
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showGrid}
              onCheckedChange={setShowGrid}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Show Grid
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={snapToGrid}
              onCheckedChange={setSnapToGrid}
              disabled={!showGrid}
            >
              <Magnet className="h-4 w-4 mr-2" />
              Snap to Grid
            </DropdownMenuCheckboxItem>
            {showGrid && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Grid Size</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setGridSize(5)}>
                  <span className={cn(gridSize === 5 && "font-medium")}>5px</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGridSize(10)}>
                  <span className={cn(gridSize === 10 && "font-medium")}>10px</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGridSize(20)}>
                  <span className={cn(gridSize === 20 && "font-medium")}>20px</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem onClick={onSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
