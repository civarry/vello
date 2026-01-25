"use client";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Mail, FileText, Calendar, Building, Send, Loader2 } from "lucide-react";
import { RecipientRecord, SendResult } from "./types";

interface ConfirmStepProps {
    recipients: RecipientRecord[];
    emailSubject: string;
    documentType: string;
    period: string;
    organizationName: string;
    isSending: boolean;
    result: SendResult | null;
}

export function ConfirmStep({
    recipients,
    emailSubject,
    documentType,
    period,
    organizationName,
    isSending,
    result,
}: ConfirmStepProps) {
    const validRecipients = recipients.filter(r => r.isValid);

    // Replace placeholders for preview
    const previewSubject = emailSubject
        .replace(/\{\{documentType\}\}/g, documentType || "Document")
        .replace(/\{\{period\}\}/g, period || "current period");

    // Sending state
    if (isSending) {
        return (
            <div className="py-12 space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <Send className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-lg font-medium">Sending emails...</p>
                        <p className="text-sm text-muted-foreground">
                            Generating PDFs and sending to {validRecipients.length} recipient{validRecipients.length !== 1 ? "s" : ""}.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Please don't close this dialog.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Results state
    if (result) {
        return (
            <div className="space-y-6">
                {/* Results Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                        <p className="text-2xl font-bold">{result.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.sent}</p>
                        <p className="text-xs text-green-700 dark:text-green-300">Sent</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failed}</p>
                        <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
                    </div>
                </div>

                {/* Success Message */}
                {result.failed === 0 && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                            All {result.sent} email{result.sent !== 1 ? "s" : ""} sent successfully!
                        </AlertDescription>
                    </Alert>
                )}

                {/* Error Details */}
                {result.errors.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Failed Emails:</p>
                        <div className="max-h-[200px] overflow-y-auto rounded-lg border">
                            <div className="p-4 space-y-2">
                                {result.errors.map((error, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 text-sm rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
                                    >
                                        <Mail className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-red-900 dark:text-red-100 truncate">
                                                {error.email}
                                            </p>
                                            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                                                {error.error}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Confirmation state (before sending)
    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/20 p-6 space-y-4">
                <h4 className="font-medium">Ready to Send</h4>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Recipients</p>
                            <p className="font-medium">{validRecipients.length} email{validRecipients.length !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Document</p>
                            <p className="font-medium">{documentType || "Document"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Period</p>
                            <p className="font-medium">{period || "Not specified"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">From</p>
                            <p className="font-medium">{organizationName}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Subject Preview</p>
                    <p className="text-sm font-medium">{previewSubject}</p>
                </div>
            </div>

            {/* Recipient List */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Recipients ({validRecipients.length})</p>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 rounded-lg border bg-muted/10">
                    {validRecipients.map((r, idx) => (
                        <Badge key={idx} variant="secondary" className="font-normal">
                            {r.name || r.email}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
}
