"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AVAILABLE_PLACEHOLDERS } from "./types";
import { PlaceholderChip } from "./placeholder-chip";
import { EmailPreview } from "./email-preview";

interface CustomizeStepProps {
    emailSubject: string;
    emailBody: string;
    documentType: string;
    period: string;
    onSubjectChange: (value: string) => void;
    onBodyChange: (value: string) => void;
    onDocumentTypeChange: (value: string) => void;
    onPeriodChange: (value: string) => void;
    previewName: string;
    organizationName: string;
}

export function CustomizeStep({
    emailSubject,
    emailBody,
    documentType,
    period,
    onSubjectChange,
    onBodyChange,
    onDocumentTypeChange,
    onPeriodChange,
    previewName,
    organizationName,
}: CustomizeStepProps) {
    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const insertPlaceholder = (placeholder: string, target: "subject" | "body") => {
        const ref = target === "subject" ? subjectRef : bodyRef;
        const setter = target === "subject" ? onSubjectChange : onBodyChange;
        const currentValue = target === "subject" ? emailSubject : emailBody;

        if (ref.current) {
            const start = ref.current.selectionStart || 0;
            const end = ref.current.selectionEnd || 0;
            const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
            setter(newValue);

            // Restore focus and set cursor position after the inserted placeholder
            setTimeout(() => {
                ref.current?.focus();
                ref.current?.setSelectionRange(start + placeholder.length, start + placeholder.length);
            }, 0);
        } else {
            setter(currentValue + placeholder);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left: Form */}
            <div className="space-y-4 overflow-y-auto pr-2">
                {/* Document Info */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="documentType" className="text-xs">Document Type</Label>
                        <Input
                            id="documentType"
                            value={documentType}
                            onChange={(e) => onDocumentTypeChange(e.target.value)}
                            placeholder="e.g., Payslip"
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="period" className="text-xs">Period</Label>
                        <Input
                            id="period"
                            value={period}
                            onChange={(e) => onPeriodChange(e.target.value)}
                            placeholder="e.g., January 2024"
                            className="h-9"
                        />
                    </div>
                </div>

                <Separator />

                {/* Subject */}
                <div className="space-y-1">
                    <Label htmlFor="emailSubject" className="text-xs">Subject Line</Label>
                    <Input
                        ref={subjectRef}
                        id="emailSubject"
                        value={emailSubject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        placeholder="Email subject..."
                        className="h-9"
                    />
                </div>

                {/* Body */}
                <div className="space-y-1 flex-1">
                    <Label htmlFor="emailBody" className="text-xs">Message Body</Label>
                    <Textarea
                        ref={bodyRef}
                        id="emailBody"
                        value={emailBody}
                        onChange={(e) => onBodyChange(e.target.value)}
                        placeholder="Email body..."
                        rows={6}
                        className="resize-none font-mono text-sm"
                    />
                </div>

                {/* Placeholders - combined */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Insert placeholder:</Label>
                    <div className="flex flex-wrap gap-1">
                        {AVAILABLE_PLACEHOLDERS.map(p => (
                            <PlaceholderChip
                                key={p.key}
                                placeholder={p.key}
                                label={p.label}
                                description={p.description}
                                onClick={() => insertPlaceholder(p.key, "body")}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-2 overflow-y-auto">
                <h4 className="text-sm font-medium">Live Preview</h4>
                <EmailPreview
                    subject={emailSubject}
                    body={emailBody}
                    recipientName={previewName}
                    documentType={documentType}
                    period={period}
                    organizationName={organizationName}
                />
            </div>
        </div>
    );
}
