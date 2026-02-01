"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ArrowLeft,
  Save,
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
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearDraft } from "@/lib/draft";
import {
  useTemplateBuilderStore,
  PaperSize,
  Orientation,
  GridSize,
} from "@/stores/template-builder-store";
import { toast } from "sonner";
import { LivePdfPreview } from "@/components/previews/live-pdf-preview";
import { Template } from "@/types/template";
import { TemplateSettingsDialog } from "../template-settings-dialog";
import { useIsDesktop, useDefaultZoom } from "@/hooks/use-media-query";
import { MobileBottomToolbar } from "./mobile-bottom-toolbar";

export function BuilderToolbar() {
  const router = useRouter();
  const isDesktop = useIsDesktop(); // >= 1024px
  const defaultZoom = useDefaultZoom();

  const {
    templateId,
    templateName,
    setTemplateName,
    paperSize,
    setPaperSize,
    orientation,
    setOrientation,
    blocks,
    isDirty,
    globalStyles,
    getSchema,
    resetDirty,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize,
    snapToGrid,
    setSnapToGrid,
    templateType,
    recipientEmailField,
    recipientNameField,
  } = useTemplateBuilderStore();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      window.location.href = "/templates";
    }
  };

  const handleConfirmLeave = () => {
    if (templateId) {
      clearDraft(templateId);
    }
    window.location.href = "/templates";
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (blocks.length === 0) {
      toast.error("Please add at least one element to the template");
      return;
    }

    setIsSaving(true);
    try {
      const schema = getSchema();
      const payload = {
        name: templateName,
        schema,
        paperSize,
        orientation,
        templateType,
        recipientEmailField,
        recipientNameField,
      };

      const url = templateId ? `/api/templates/${templateId}` : "/api/templates";
      const method = templateId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save template");
      }

      resetDirty();

      if (templateId) {
        clearDraft(templateId);
      }

      if (!templateId && result.data?.id) {
        router.replace(`/templates/${result.data.id}/edit`);
      }

      toast.success(templateId ? "Template updated" : "Template saved");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (blocks.length === 0) {
      toast.error("Please add elements to the template before exporting");
      return;
    }

    setIsExporting(true);
    try {
      const url = templateId
        ? `/api/templates/${templateId}/export`
        : "/api/templates/export";

      const response = templateId
        ? await fetch(url)
        : await fetch("/api/templates/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks,
            globalStyles,
            paperSize,
            orientation,
            name: templateName,
          }),
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export PDF");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${templateName || "template"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const previewTemplate: Template = {
    id: templateId || "temp-preview",
    name: templateName,
    paperSize,
    orientation,
    schema: {
      blocks,
      globalStyles,
      variables: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <>
      {/* Top Toolbar - Sticky within container */}
      <div className="sticky top-0 z-40 flex h-12 lg:h-14 items-center justify-between border-b bg-background px-2 sm:px-4 gap-2">
        {/* Left: Back, Name, Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={handleBack} className="flex-shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 flex-1 max-w-[200px] lg:max-w-[240px] border-none bg-transparent px-2 text-sm font-medium focus-visible:ring-1"
            placeholder="Template name"
          />

          {/* Status indicator */}
          <div className="hidden sm:flex items-center flex-shrink-0">
            {isDirty ? (
              <span className="text-xs text-muted-foreground">
                Unsaved
              </span>
            ) : templateId ? (
              <span className="text-xs text-green-600 dark:text-green-500">Saved</span>
            ) : null}
          </div>
        </div>

        {/* Right: Desktop tools OR Save button on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isDesktop ? (
            // Desktop: Full toolbar
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSettingsOpen ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-8 w-8"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Template Settings</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo */}
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={undo}
                      disabled={!canUndo()}
                      className="h-8 w-8"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={redo}
                      disabled={!canRedo()}
                      className="h-8 w-8"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Paper Size & Orientation */}
              <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="LETTER">Letter</SelectItem>
                  <SelectItem value="LEGAL">Legal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PORTRAIT">Portrait</SelectItem>
                  <SelectItem value="LANDSCAPE">Landscape</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={zoomOut}
                      disabled={zoom <= 0.25}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom Out</TooltipContent>
                </Tooltip>
                <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={zoomIn}
                      disabled={zoom >= 2}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom In</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setZoom(defaultZoom)}
                      className="h-8 w-8"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Fit to Screen</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* View Controls */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={(showRulers || showGrid) ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 gap-1"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden xl:inline">View</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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

              <Separator orientation="vertical" className="h-6" />

              {/* Action Buttons */}
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} className="h-8">
                <Eye className="h-4 w-4 xl:mr-2" />
                <span className="hidden xl:inline">Preview</span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="h-8">
                {isExporting ? (
                  <Loader2 className="h-4 w-4 xl:mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 xl:mr-2" />
                )}
                <span className="hidden xl:inline">Export</span>
              </Button>

              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 xl:mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 xl:mr-2" />
                )}
                <span className="hidden xl:inline">Save</span>
              </Button>
            </>
          ) : (
            // Mobile/Tablet: Just save button (other tools in bottom bar)
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Toolbar */}
      {!isDesktop && (
        <MobileBottomToolbar
          onPreview={() => setIsPreviewOpen(true)}
          onExport={handleExport}
          onSettings={() => setIsSettingsOpen(true)}
          isExporting={isExporting}
        />
      )}

      {/* Settings Dialog */}
      <TemplateSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className={cn(
            "flex flex-col p-0 gap-0 max-h-[90vh]",
            orientation === "LANDSCAPE"
              ? "max-w-6xl h-[70vh]"
              : "max-w-4xl h-[85vh]"
          )}
          aria-describedby={undefined}
        >
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Template Preview (PDF)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/50 p-2 sm:p-4 overflow-hidden">
            <div className="h-full w-full bg-white shadow-sm rounded-md overflow-hidden">
              {isPreviewOpen && (
                <LivePdfPreview
                  key={`${orientation}-${paperSize}`}
                  template={previewTemplate}
                  data={{}}
                  debouncedDelay={500}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
