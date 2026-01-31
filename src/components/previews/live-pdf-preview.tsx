"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Template } from "@/types/template";
import { Loader2 } from "lucide-react";
import { applyDataToBlocks } from "@/lib/template-utils";

interface LivePdfPreviewProps {
  template: Template;
  data: Record<string, string>;
  debouncedDelay?: number;
}

export function LivePdfPreview({ template, data, debouncedDelay = 500 }: LivePdfPreviewProps) {
  const [debouncedData, setDebouncedData] = useState(data);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce data changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedData(data);
    }, debouncedDelay);
    return () => clearTimeout(handler);
  }, [data, debouncedDelay]);

  // Apply data substitution to blocks
  const substitutedBlocks = useMemo(
    () => applyDataToBlocks(template.schema.blocks, debouncedData),
    [template.schema.blocks, debouncedData]
  );

  // Generate PDF via server API
  useEffect(() => {
    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const generatePdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: substitutedBlocks,
            globalStyles: template.schema.globalStyles,
            paperSize: template.paperSize,
            orientation: template.orientation,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const blob = await response.blob();

        // Revoke previous URL to prevent memory leaks
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was aborted, ignore
          return;
        }
        console.error("[LivePdfPreview] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to generate preview");
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    generatePdf();

    return () => {
      abortController.abort();
    };
  }, [substitutedBlocks, template.schema.globalStyles, template.paperSize, template.orientation]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  if (loading && !pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground p-4">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="text-sm">Generating preview...</span>
      </div>
    );
  }

  if (error && !pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-destructive p-4">
        <span className="text-sm">Failed to load preview: {error}</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        src={`${pdfUrl}#toolbar=0&view=Fit`}
        className="h-full w-full border-none bg-transparent"
        title="PDF Preview"
      />
    </div>
  );
}
