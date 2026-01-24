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
import { ArrowLeft, Save, Eye, Download, Loader2, RotateCcw, RotateCw, Minus, Plus, Maximize2, Ruler, Grid3X3, Magnet } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearDraft } from "@/lib/draft";
import {
  useTemplateBuilderStore,
  PaperSize,
  Orientation,
  GridSize,
  PAPER_DIMENSIONS,
} from "@/stores/template-builder-store";
import { toast } from "sonner";
import { LivePdfPreview } from "@/components/previews/live-pdf-preview";
import { Template } from "@/types/template";

export function BuilderToolbar() {
  const router = useRouter();
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
    zoomToFit,
    resetZoom,
    // Grid and rulers
    showRulers,
    setShowRulers,
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize,
    snapToGrid,
    setSnapToGrid,
    guides,
  } = useTemplateBuilderStore();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      // Use hard navigation to ensure sidebar refreshes with correct org
      window.location.href = "/templates";
    }
  };

  const handleConfirmLeave = () => {
    // Clear draft since user is discarding changes
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

      // Clear the draft since changes are now saved
      if (templateId) {
        clearDraft(templateId);
      }

      if (!templateId && result.data?.id) {
        // Redirect to edit URL for new templates
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
      // If template is saved, use GET endpoint, otherwise POST with current data
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

      // Download the PDF
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

  // Construct a temporary template object for the preview
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
      <div className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 w-48 border-none bg-transparent px-2 text-sm font-medium focus-visible:ring-1"
            placeholder="Template name"
          />
          {isDirty ? (
            <span className="text-xs text-muted-foreground" title="Your changes are auto-saved as a draft">
              Unsaved changes <span className="text-muted-foreground/60">(draft auto-saved)</span>
            </span>
          ) : templateId ? (
            <span className="text-xs text-green-600 dark:text-green-500">Saved</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
            <SelectTrigger className="h-8 w-24">
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
                  size="sm"
                  onClick={zoomOut}
                  disabled={zoom <= 0.25}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoom >= 2}
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
                  size="sm"
                  onClick={resetZoom}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset Zoom (100%)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Canvas Display Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showRulers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRulers(!showRulers)}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle Rulers</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle Grid</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snapToGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  disabled={!showGrid}
                >
                  <Magnet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Snap to Grid</TooltipContent>
            </Tooltip>
            {showGrid && (
              <Select value={String(gridSize)} onValueChange={(v) => setGridSize(Number(v) as GridSize)}>
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5px</SelectItem>
                  <SelectItem value="10">10px</SelectItem>
                  <SelectItem value="20">20px</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>

          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className={cn(
            "flex flex-col p-0 gap-0",
            orientation === "LANDSCAPE"
              ? "max-w-6xl h-[70vh]"
              : "max-w-4xl h-[85vh]"
          )}
        >
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Template Preview (PDF)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/50 p-4 overflow-hidden">
            <div className="h-full w-full bg-white shadow-sm rounded-md overflow-hidden">
              {/* Use the PDF Preview Component */}
              <LivePdfPreview
                template={previewTemplate}
                data={{}}
                debouncedDelay={500}
              />
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
