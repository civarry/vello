"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Template } from "@/types/template";
import { Loader2 } from "lucide-react";
import { applyDataToBlocks } from "@/lib/template-utils";

interface LivePdfPreviewProps {
  template: Template;
  data: Record<string, string>;
  debouncedDelay?: number;
}

export function LivePdfPreview({ template, data, debouncedDelay = 500 }: LivePdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Apply data substitution to blocks
  const substitutedBlocks = useMemo(
    () => applyDataToBlocks(template.schema.blocks, data),
    [template.schema.blocks, data]
  );

  // Stable reference for the request payload
  const requestPayload = useMemo(
    () => JSON.stringify({
      blocks: substitutedBlocks,
      globalStyles: template.schema.globalStyles,
      paperSize: template.paperSize,
      orientation: template.orientation,
    }),
    [substitutedBlocks, template.schema.globalStyles, template.paperSize, template.orientation]
  );

  const generatePdf = useCallback(async (payload: string, signal: AbortSignal): Promise<string> => {
    const response = await fetch("/api/templates/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const blob = await response.blob();

    // Convert blob to base64 data URL for better mobile browser compatibility
    // Blob URLs don't work reliably in iframes on mobile browsers (especially iOS Safari)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert PDF to data URL"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read PDF blob"));
      reader.readAsDataURL(blob);
    });
  }, []);

  // Debounced PDF generation
  useEffect(() => {
    isMountedRef.current = true;

    const timeoutId = setTimeout(async () => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      try {
        const dataUrl = await generatePdf(requestPayload, abortController.signal);

        if (!isMountedRef.current || abortController.signal.aborted) {
          return;
        }

        setPdfUrl(dataUrl);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!isMountedRef.current) {
          return;
        }
        console.error("[LivePdfPreview] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to generate preview");
      } finally {
        if (isMountedRef.current && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, debouncedDelay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [requestPayload, debouncedDelay, generatePdf]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
      {pdfUrl && (
        <iframe
          src={`${pdfUrl}#toolbar=0&view=Fit`}
          className="h-full w-full border-none bg-transparent"
          title="PDF Preview"
        />
      )}
    </div>
  );
}
