"use client";

import { FileText, Paperclip } from "lucide-react";

interface EmailPreviewProps {
    subject: string;
    body: string;
    recipientName: string;
    documentType: string;
    period: string;
    organizationName: string;
}

export function EmailPreview({
    subject,
    body,
    recipientName,
    documentType,
    period,
    organizationName,
}: EmailPreviewProps) {
    // Replace placeholders with actual values
    const replacePlaceholders = (text: string) => {
        return text
            .replace(/\{\{recipientName\}\}/g, recipientName || "Recipient")
            .replace(/\{\{documentType\}\}/g, documentType || "Document")
            .replace(/\{\{period\}\}/g, period || "current period")
            .replace(/\{\{organizationName\}\}/g, organizationName || "Your Organization");
    };

    const previewSubject = replacePlaceholders(subject);
    const previewBody = replacePlaceholders(body);

    return (
        <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
            {/* Email Header */}
            <div className="border-b bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-16">To:</span>
                    <span className="font-medium">{recipientName || "Recipient"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-16">Subject:</span>
                    <span className="font-medium">{previewSubject || "No subject"}</span>
                </div>
            </div>

            {/* Email Body */}
            <div className="p-4 min-h-[200px]">
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                    {previewBody || "No content"}
                </pre>
            </div>

            {/* Attachment Preview */}
            <div className="border-t bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <span>Attachment:</span>
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-lg border bg-background p-3">
                    <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">{documentType || "Document"}-{recipientName || "Recipient"}.pdf</p>
                        <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
