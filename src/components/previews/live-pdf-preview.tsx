"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Template } from "@/types/template";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import { applyDataToBlocks } from "@/lib/template-utils";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";

interface LivePdfPreviewProps {
  template: Template;
  data: Record<string, string>;
  debouncedDelay?: number;
}

export function LivePdfPreview({ template, data, debouncedDelay = 500 }: LivePdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isMobile = useIsMobile();

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

  // Mobile download handler
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadComplete(false);
    setError(null);

    try {
      const response = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestPayload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name || "template-preview"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }, [requestPayload, template.name]);

  // Debounced PDF generation (desktop only)
  useEffect(() => {
    // Skip auto-generation on mobile - use download button instead
    if (isMobile) {
      setLoading(false);
      return;
    }

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
  }, [requestPayload, debouncedDelay, generatePdf, isMobile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Mobile: Show download button instead of iframe
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        {downloadComplete ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm text-muted-foreground">PDF downloaded successfully</p>
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              Download Again
            </Button>
          </>
        ) : (
          <>
            <Download className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              PDF preview is not available on mobile.
              <br />
              Tap below to download and view the file.
            </p>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Desktop: Loading state
  if (loading && !pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground p-4">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="text-sm">Generating preview...</span>
      </div>
    );
  }

  // Desktop: Error state
  if (error && !pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-destructive p-4">
        <span className="text-sm">Failed to load preview: {error}</span>
      </div>
    );
  }

  // Desktop: PDF iframe preview
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
