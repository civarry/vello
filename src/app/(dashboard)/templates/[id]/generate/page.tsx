"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Mail,
  Eye,
  MoreVertical,
  Maximize2,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import type { Template } from "@/types/template";
import { LivePdfPreview } from "@/components/previews/live-pdf-preview";
import {
  extractUsedVariables,
  applyDataToBlocks,
  type VariableInfo
} from "@/lib/template-utils";
import { BatchSendDialog } from "@/components/generate/batch-send-dialog";
import { GeneralSendDialog } from "@/components/generate/general-send-dialog";


export default function GenerateDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [hasSmtpConfig, setHasSmtpConfig] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<{
    emailSubject?: string;
    emailBody?: string;
    senderName?: string;
  } | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");

  // Data Grid State
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(0);
  const [usedVariables, setUsedVariables] = useState<VariableInfo[]>([]);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const response = await fetch(`/api/templates/${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error("Template not found");
        }
        const result = await response.json();
        setTemplate(result.data);

        // Extract used variables
        const variables = extractUsedVariables(result.data.schema.blocks);
        setUsedVariables(variables);

        // Initialize with one empty row
        const initialRow: Record<string, string> = {};
        variables.forEach((v) => {
          initialRow[v.key] = "";
        });
        setRecords([initialRow]);

      } catch (error) {
        console.error("Failed to fetch template:", error);
        toast.error("Failed to load template");
        router.push("/templates");
      } finally {
        setIsLoading(false);
      }
    }

    async function checkSmtpConfig() {
      try {
        const response = await fetch("/api/smtp/config");
        const data = await response.json();
        setHasSmtpConfig(!!data.data);

        // Set organization name from API response
        if (data.organizationName) {
          setOrganizationName(data.organizationName);
        }

        if (data.data) {
          setSmtpConfig({
            emailSubject: data.data.emailSubject,
            emailBody: data.data.emailBody,
            senderName: data.data.senderName,
          });
        }
      } catch (error) {
        console.error("Failed to check SMTP config:", error);
      }
    }

    fetchTemplate();
    checkSmtpConfig();
  }, [resolvedParams.id, router]);

  // --- Grid Actions ---

  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    setRecords(prev => {
      const newRecords = [...prev];
      newRecords[rowIndex] = { ...newRecords[rowIndex], [key]: value };
      return newRecords;
    });
  };

  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    usedVariables.forEach((v) => {
      newRow[v.key] = "";
    });
    setRecords(prev => [...prev, newRow]);
    // Automatically select the new row
    setSelectedRecordIndex(records.length);
  };

  const handleDeleteRow = (index: number) => {
    if (records.length <= 1) {
      // Don't delete the last row, just clear it
      const clearedRow: Record<string, string> = {};
      usedVariables.forEach(v => clearedRow[v.key] = "");
      setRecords([clearedRow]);
      return;
    }

    setRecords(prev => prev.filter((_, i) => i !== index));
    if (selectedRecordIndex >= index && selectedRecordIndex > 0) {
      setSelectedRecordIndex(prev => prev - 1);
    }
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      const initialRow: Record<string, string> = {};
      usedVariables.forEach((v) => {
        initialRow[v.key] = "";
      });
      setRecords([initialRow]);
      setSelectedRecordIndex(0);
    }
  };

  // --- File Actions ---

  const handleDownloadTemplate = () => {
    try {
      window.location.href = `/api/templates/${resolvedParams.id}/excel-template`;
      toast.success("Excel template download started");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download template");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/templates/${resolvedParams.id}/batch-generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to parse file");

      const result = await response.json();
      const importedData = result.data;

      if (importedData.length === 0) {
        toast.warning("No valid records found in file");
        return;
      }

      // Append or Replace? Let's Confirm if records are dirty
      const isDirty = records.length > 1 || Object.values(records[0]).some(v => v !== "");

      if (isDirty) {
        if (confirm("Do you want to REPLACE existing data? Cancel to APPEND.")) {
          setRecords(importedData);
          setSelectedRecordIndex(0);
        } else {
          setRecords(prev => [...prev, ...importedData]);
        }
      } else {
        setRecords(importedData);
        setSelectedRecordIndex(0);
      }

      toast.success(`Imported ${importedData.length} records`);
    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error("Failed to parse Excel file");
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Export Actions ---

  const handleGenerate = async () => {
    if (!template) return;

    // Filter out completely empty rows
    const validRecords = records.filter(row =>
      Object.values(row).some(val => val.trim() !== "")
    );

    if (validRecords.length === 0) {
      toast.error("Please enter data before generating.");
      return;
    }

    setIsExporting(true);
    try {
      if (validRecords.length === 1) {
        // Single PDF Export
        const response = await fetch("/api/templates/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: applyDataToBlocks(template.schema.blocks, validRecords[0]),
            globalStyles: template.schema.globalStyles,
            paperSize: template.paperSize,
            orientation: template.orientation,
            name: `${template.name}-payslip`,
          }),
        });

        if (!response.ok) throw new Error((await response.json()).error);

        const blob = await response.blob();
        downloadBlob(blob, `${template.name}-payslip.pdf`);
        toast.success("Payslip exported successfully");

      } else {
        // Batch ZIP Export
        toast.info(`Generating ${validRecords.length} payslips...`);

        const response = await fetch(`/api/templates/${resolvedParams.id}/batch-export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: template.schema.blocks,
            globalStyles: template.schema.globalStyles,
            paperSize: template.paperSize,
            orientation: template.orientation,
            name: template.name,
            batchData: validRecords
          }),
        });

        if (!response.ok) throw new Error((await response.json()).error);

        const blob = await response.blob();
        downloadBlob(blob, `${template.name}-batch-export.zip`);
        toast.success("Batch export completed successfully");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) return null;

  // Check if template has variables that need data input
  const hasVariables = usedVariables.length > 0;

  // Simple export for templates with no variables
  const handleSimpleExport = async () => {
    if (!template) return;
    setIsExporting(true);
    try {
      const response = await fetch("/api/templates/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: template.schema.blocks,
          globalStyles: template.schema.globalStyles,
          paperSize: template.paperSize,
          orientation: template.orientation,
          name: template.name,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error);

      const blob = await response.blob();
      downloadBlob(blob, `${template.name}.pdf`);
      toast.success("Document exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setIsExporting(false);
    }
  };

  // Render simplified view for templates without variables
  if (!hasVariables) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        {/* Desktop Header */}
        <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{template.name}</span>
              <span className="text-muted-foreground">/ Generate Documents</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasSmtpConfig && (
              <Button variant="outline" size="sm" onClick={() => setShowSendDialog(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Send via Email
              </Button>
            )}
            <Button onClick={handleSimpleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex h-12 items-center justify-between border-b bg-background px-3 shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/templates">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate max-w-[180px]">{template.name}</span>
            </div>
          </div>
        </div>

        {/* Full-width Preview */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <div className="h-full flex flex-col">
            <div className="p-3 border-b bg-background/50 backdrop-blur flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-2">
                <Maximize2 className="h-3 w-3" /> Document Preview
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                This template has no variable fields - ready to export as-is
              </span>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-50/50 relative">
              <LivePdfPreview template={template} data={{}} />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="md:hidden border-t bg-background p-3 flex gap-2">
          {hasSmtpConfig && (
            <Button variant="outline" className="flex-1" onClick={() => setShowSendDialog(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Send
            </Button>
          )}
          <Button className="flex-1" onClick={handleSimpleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>

        {/* Send Dialog for templates without variables */}
        <GeneralSendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          templateId={resolvedParams.id}
          templateName={template.name}
          defaultSubject={smtpConfig?.emailSubject}
          defaultBody={smtpConfig?.emailBody}
          organizationName={organizationName}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Desktop Header */}
      <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{template.name}</span>
            <span className="text-muted-foreground">/ Generate Documents</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          {hasSmtpConfig && (
            <Button variant="outline" size="sm" onClick={() => setShowSendDialog(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Send via Email
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {records.length > 1 ? "Generate Batch (ZIP)" : "Generate PDF"}
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex h-12 items-center justify-between border-b bg-background px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate max-w-[150px]">{template.name}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Grid - Full Width */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="p-2 border-b flex items-center gap-2 bg-muted/20">
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="secondary" size="sm" onClick={handleImportClick} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
            <span className="hidden sm:inline">Import Excel</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleAddRow}>
            <Plus className="mr-2 h-3 w-3" />
            <span className="hidden sm:inline">Add Row</span>
            <span className="sm:hidden">Add</span>
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleClearAll}>
            <Trash2 className="h-3 w-3 sm:mr-2" />
            <span className="hidden sm:inline">Clear All</span>
          </Button>
        </div>

        {/* Grid Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 w-10 border-b text-center text-muted-foreground font-medium">#</th>
                {usedVariables.map(v => (
                  <th key={v.key} className="p-2 border-b text-left font-medium min-w-[150px] whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{v.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal opacity-70">{v.key}</span>
                    </div>
                  </th>
                ))}
                <th className="p-2 w-10 border-b"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((row, rowIndex) => {
                const isSelected = rowIndex === selectedRecordIndex;
                return (
                  <tr
                    key={rowIndex}
                    className={`group transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    onClick={() => setSelectedRecordIndex(rowIndex)}
                  >
                    <td className="p-2 text-center text-xs text-muted-foreground select-none">
                      {rowIndex + 1}
                    </td>
                    {usedVariables.map(v => (
                      <td key={v.key} className="p-1 border-r relative min-w-[150px]">
                        <input
                          className="w-full h-full p-1.5 bg-transparent outline-none focus:bg-background focus:ring-1 ring-primary/20 rounded-sm transition-all text-sm"
                          value={row[v.key] || ""}
                          onChange={(e) => handleCellChange(rowIndex, v.key, e.target.value)}
                          placeholder="..."
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleDeleteRow(rowIndex); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State / Add Row Hint */}
          <div className="p-8 flex justify-center">
            <Button variant="outline" size="sm" onClick={handleAddRow} className="border-dashed text-muted-foreground">
              <Plus className="mr-2 h-3 w-3" /> Add another record
            </Button>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-2 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
          <span>{records.length} Record{records.length !== 1 ? 's' : ''}</span>
          <span>{usedVariables.length} Columns</span>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="md:hidden border-t bg-background p-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setIsPreviewOpen(true)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        {hasSmtpConfig && (
          <Button variant="outline" className="flex-1" onClick={() => setShowSendDialog(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Send
          </Button>
        )}
        <Button className="flex-1" onClick={handleGenerate} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {records.length > 1 ? "ZIP" : "PDF"}
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className={cn(
            "flex flex-col p-0 gap-0",
            template.orientation === "LANDSCAPE"
              ? "w-[95vw] h-[85vh] max-w-none"
              : "w-[85vw] max-w-[800px] h-[95vh] max-h-[95vh]"
          )}
          aria-describedby={undefined}
        >
          <DialogHeader className="p-3 border-b flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-base">
              Preview: Record #{selectedRecordIndex + 1}
            </DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 mr-6">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use Ctrl + scroll wheel to zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 p-4 min-h-0 overflow-auto flex items-center justify-center">
            <div
              className="bg-white shadow-lg rounded-sm overflow-hidden"
              style={{
                width: template.orientation === "LANDSCAPE" ? '100%' : 'auto',
                height: template.orientation === "LANDSCAPE" ? 'auto' : '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: template.orientation === "LANDSCAPE" ? '1.414 / 1' : '1 / 1.414',
              }}
            >
              {isPreviewOpen && (
                <LivePdfPreview
                  key={`${template.orientation}-${template.paperSize}-${selectedRecordIndex}`}
                  template={template}
                  data={records[selectedRecordIndex] || {}}
                  debouncedDelay={300}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dialog - Conditional based on template type */}
      {template.templateType === "GENERAL" ? (
        <GeneralSendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          templateId={resolvedParams.id}
          templateName={template.name}
          defaultSubject={smtpConfig?.emailSubject}
          defaultBody={smtpConfig?.emailBody}
          organizationName={organizationName}
        />
      ) : (
        <BatchSendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          templateId={resolvedParams.id}
          records={records}
          emailField={template.recipientEmailField || usedVariables.find(v =>
            v.key.toLowerCase().includes("email") ||
            v.label.toLowerCase().includes("email")
          )?.key}
          nameField={template.recipientNameField || usedVariables.find(v =>
            (v.key.toLowerCase().includes("name") && !v.key.toLowerCase().includes("email")) ||
            (v.label.toLowerCase().includes("name") && !v.label.toLowerCase().includes("email"))
          )?.key}
          defaultSubject={smtpConfig?.emailSubject}
          defaultBody={smtpConfig?.emailBody}
          organizationName={organizationName}
        />
      )}
    </div>
  );
}
