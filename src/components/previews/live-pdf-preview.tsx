"use client";

import { useEffect, useState } from "react";
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

export function LivePdfPreview({ template, data, debouncedDelay = 500 }: LivePdfPreviewProps) {
    // Debounce the data to prevent excessive PDF generation
    const [debouncedData, setDebouncedData] = useState(data);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedData(data);
        }, debouncedDelay);

        return () => clearTimeout(handler);
    }, [data, debouncedDelay]);

    // Use the utility to transform blocks with data
    const substitutedBlocks = applyDataToBlocks(template.schema.blocks, debouncedData);

    // Generate the document component
    const MyDocument = (
        <TemplatePDF
            blocks={substitutedBlocks}
            globalStyles={template.schema.globalStyles}
            paperSize={template.paperSize}
            orientation={template.orientation}
        />
    );

    const [instance, updateInstance] = usePDF({ document: MyDocument });

    // Force update when data changes
    useEffect(() => {
        updateInstance(MyDocument);
    }, [debouncedData, updateInstance]);

    if (instance.loading && !instance.url) {
        return (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground p-4">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span className="text-sm">Generating Preview...</span>
            </div>
        );
    }

    if (instance.error) {
        return (
            <div className="flex h-full w-full items-center justify-center text-destructive p-4">
                <span className="text-sm">Failed to load preview: {instance.error}</span>
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
