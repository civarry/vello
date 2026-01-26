"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Server } from "lucide-react";
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
    // Provider props
    providers: any[];
    selectedProviderId: string;
    onProviderSelect: (id: string) => void;
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
    providers,
    selectedProviderId,
    onProviderSelect,
}: CustomizeStepProps) {
    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const [activeField, setActiveField] = useState<"subject" | "body">("body");

    const insertPlaceholder = (placeholder: string) => {
        const target = activeField;
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

    const selectedProvider = providers.find(p => p.id === selectedProviderId);

    return (
        <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left: Form */}
            <div className="space-y-4 overflow-y-auto pr-2">
                {/* Sender Selection */}
                <div className="space-y-2">
                    <Label className="text-xs">Send As</Label>
                    {providers.length > 0 ? (
                        <Select value={selectedProviderId} onValueChange={onProviderSelect}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select email configuration" />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map((provider) => (
                                    <SelectItem key={provider.id} value={provider.id}>
                                        <div className="flex items-center gap-2">
                                            {provider.provider?.name === "Gmail" ? (
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                                                    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                                </svg>
                                            ) : provider.provider?.name === "Outlook" ? (
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                                                    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                                                    <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
                                                </svg>
                                            ) : (
                                                <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            )}
                                            <span className="truncate">{provider.name}</span>
                                            <span className="text-muted-foreground text-xs truncate">
                                                ({provider.senderEmail})
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            No email configuration found. Please set up SMTP in settings.
                        </div>
                    )}
                </div>

                {/* Sender Details Preview */}
                {selectedProvider && (
                    <div className="rounded-md bg-muted/50 p-3 text-xs flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Sending as <strong>{selectedProvider.senderEmail}</strong></span>
                        {selectedProvider.senderName && (
                            <span>({selectedProvider.senderName})</span>
                        )}
                    </div>
                )}

                <Separator />

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

                {/* Subject */}
                <div className="space-y-1">
                    <Label htmlFor="emailSubject" className="text-xs">
                        Subject Line <span className="text-muted-foreground font-normal">(Click placeholders to insert)</span>
                    </Label>
                    <Input
                        ref={subjectRef}
                        id="emailSubject"
                        value={emailSubject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        onFocus={() => setActiveField("subject")}
                        placeholder="Email subject..."
                        className={`h-9 ${activeField === "subject" ? "ring-2 ring-primary/20 border-primary" : ""}`}
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
                        onFocus={() => setActiveField("body")}
                        placeholder="Email body..."
                        rows={6}
                        className={`resize-none font-mono text-sm ${activeField === "body" ? "ring-2 ring-primary/20 border-primary" : ""}`}
                    />
                </div>

                {/* Placeholders - combined */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                        Insert into <strong>{activeField === "subject" ? "Subject" : "Body"}</strong>:
                    </Label>
                    <div className="flex flex-wrap gap-1">
                        {AVAILABLE_PLACEHOLDERS.map(p => (
                            <PlaceholderChip
                                key={p.key}
                                placeholder={p.key}
                                label={p.label}
                                description={p.description}
                                onClick={() => insertPlaceholder(p.key)}
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
