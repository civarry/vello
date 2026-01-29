"use client";

import { useEffect, useState, useMemo } from "react";
import { usePDF } from "@react-pdf/renderer";
import { TemplatePDF } from "@/lib/pdf/template-pdf";
import { Template } from "@/types/template";
import { Loader2 } from "lucide-react";
import { applyDataToBlocks } from "@/lib/template-utils";

interface LivePdfPreviewProps {
  template: Template;
  data: Record<string, any>;
  debouncedDelay?: number;
}

// Inner component that handles PDF generation - isolated for clean unmount/remount
function PdfRenderer({
  blocks,
  globalStyles,
  paperSize,
  orientation,
}: {
  blocks: any[];
  globalStyles: any;
  paperSize: string;
  orientation: string;
}) {
  const document = useMemo(
    () => (
      <TemplatePDF
        blocks={blocks}
        globalStyles={globalStyles}
        paperSize={paperSize as "A4" | "LETTER" | "LEGAL"}
        orientation={orientation as "PORTRAIT" | "LANDSCAPE"}
      />
    ),
    [blocks, globalStyles, paperSize, orientation]
  );

  const [instance, updateInstance] = usePDF({ document });

  // Update when document changes
  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (instance.url) {
        URL.revokeObjectURL(instance.url);
      }
    };
  }, [instance.url]);

  if (instance.loading && !instance.url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground p-4">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="text-sm">Generating preview...</span>
      </div>
    );
  }

  if (instance.error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-destructive p-4">
        <span className="text-sm">Failed to load preview: {String(instance.error)}</span>
      </div>
    );
  }

  return (
    <iframe
      src={`${instance.url}#toolbar=0&view=Fit`}
      className="h-full w-full border-none bg-transparent"
      title="PDF Preview"
    />
  );
}

export function LivePdfPreview({ template, data, debouncedDelay = 500 }: LivePdfPreviewProps) {
  const [debouncedData, setDebouncedData] = useState(data);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedData(data);
    }, debouncedDelay);
    return () => clearTimeout(handler);
  }, [data, debouncedDelay]);

  const substitutedBlocks = useMemo(
    () => applyDataToBlocks(template.schema.blocks, debouncedData),
    [template.schema.blocks, debouncedData]
  );

  // Key forces complete remount when orientation/size changes, ensuring clean usePDF state
  const renderKey = `${template.paperSize}-${template.orientation}`;

  return (
    <PdfRenderer
      key={renderKey}
      blocks={substitutedBlocks}
      globalStyles={template.schema.globalStyles}
      paperSize={template.paperSize}
      orientation={template.orientation}
    />
  );
}
