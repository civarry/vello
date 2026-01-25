"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Mail,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import {
    DEFAULT_EMAIL_SUBJECT,
    DEFAULT_EMAIL_BODY,
    AVAILABLE_PLACEHOLDERS,
} from "./email-send-wizard/types";
import { PlaceholderChip } from "./email-send-wizard/placeholder-chip";
import { EmailPreview } from "./email-send-wizard/email-preview";

interface GeneralSendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templateId: string;
    templateName: string;
    defaultSubject?: string;
    defaultBody?: string;
    organizationName?: string;
}

interface SendResult {
    sent: number;
    failed: number;
    total: number;
    errors: Array<{ email: string; error: string }>;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GeneralSendDialog({
    open,
    onOpenChange,
    templateId,
    templateName,
    defaultSubject,
    defaultBody,
    organizationName = "Your Organization",
}: GeneralSendDialogProps) {
    // Form state
    const [recipientInput, setRecipientInput] = useState("");
    const [emailSubject, setEmailSubject] = useState(defaultSubject || DEFAULT_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(defaultBody || DEFAULT_EMAIL_BODY);
    const [documentType, setDocumentType] = useState("Document");
    const [period, setPeriod] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);

    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    // Parse and validate emails
    const parsedEmails = useMemo(() => {
        if (!recipientInput.trim()) return [];

        // Split by comma, newline, semicolon, or space
        const emails = recipientInput
            .split(/[,;\n\s]+/)
            .map(e => e.trim())
            .filter(e => e.length > 0);

        return emails.map(email => ({
            email,
            isValid: EMAIL_REGEX.test(email),
        }));
    }, [recipientInput]);

    const validEmails = parsedEmails.filter(e => e.isValid);
    const invalidEmails = parsedEmails.filter(e => !e.isValid);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setRecipientInput("");
            setEmailSubject(defaultSubject || DEFAULT_EMAIL_SUBJECT);
            setEmailBody(defaultBody || DEFAULT_EMAIL_BODY);
            setDocumentType("Document");
            setPeriod("");
            setResult(null);
        }
    }, [open, defaultSubject, defaultBody]);

    const insertPlaceholder = (placeholder: string, target: "subject" | "body") => {
        const ref = target === "subject" ? subjectRef : bodyRef;
        const setter = target === "subject" ? setEmailSubject : setEmailBody;
        const currentValue = target === "subject" ? emailSubject : emailBody;

        if (ref.current) {
            const start = ref.current.selectionStart || 0;
            const end = ref.current.selectionEnd || 0;
            const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
            setter(newValue);

            setTimeout(() => {
                ref.current?.focus();
                ref.current?.setSelectionRange(start + placeholder.length, start + placeholder.length);
            }, 0);
        } else {
            setter(currentValue + placeholder);
        }
    };

    const handleSend = async () => {
        if (validEmails.length === 0) {
            toast.error("Please enter at least one valid email address");
            return;
        }

        setIsSending(true);

        try {
            // Create a batch with all the same data for each recipient
            const batchData = validEmails.map(({ email }) => ({
                Email: email,
                Name: email.split("@")[0], // Use email prefix as name
            }));

            const response = await fetch(`/api/templates/${templateId}/batch-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    batchData,
                    documentType,
                    period,
                    emailField: "Email",
                    nameField: "Name",
                    emailSubject,
                    emailBody,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send emails");
            }

            setResult(data);

            if (data.failed === 0) {
                toast.success(`Successfully sent ${data.sent} email(s)!`);
            } else if (data.sent > 0) {
                toast.warning(`Sent ${data.sent} email(s), ${data.failed} failed`);
            } else {
                toast.error("Failed to send emails");
            }
        } catch (error) {
            console.error("Failed to send emails:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send emails");
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        if (!isSending) {
            onOpenChange(false);
        }
    };

    // Results view
    if (result) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Send Complete</DialogTitle>
                        <DialogDescription>Email sending results</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Results Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4 text-center">
                                <p className="text-2xl font-bold">{result.total}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {result.sent}
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300">Sent</p>
                            </div>
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {result.failed}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
                            </div>
                        </div>

                        {/* Success Message */}
                        {result.failed === 0 && (
                            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    All emails sent successfully!
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
                                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
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

                    <DialogFooter>
                        <Button onClick={handleClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Sending view
    if (isSending) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <div className="py-12 space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <Send className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-medium">Sending emails...</p>
                                <p className="text-sm text-muted-foreground">
                                    Sending to {validEmails.length} recipient{validEmails.length !== 1 ? "s" : ""}.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Please don't close this dialog.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Main form view
    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send Document</DialogTitle>
                    <DialogDescription>
                        Send "{templateName}" to multiple recipients
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    {/* Left: Form */}
                    <div className="space-y-6">
                        {/* Recipients */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Recipients</h4>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="recipients">Email Addresses</Label>
                                <Textarea
                                    id="recipients"
                                    value={recipientInput}
                                    onChange={(e) => setRecipientInput(e.target.value)}
                                    placeholder="Enter email addresses (comma, newline, or space separated)"
                                    rows={4}
                                    className="resize-none font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Separate multiple emails with commas, newlines, or spaces
                                </p>
                            </div>

                            {/* Email validation feedback */}
                            {parsedEmails.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {validEmails.length} valid
                                        </span>
                                        {invalidEmails.length > 0 && (
                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <XCircle className="h-3 w-3" />
                                                {invalidEmails.length} invalid
                                            </span>
                                        )}
                                    </div>

                                    {invalidEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {invalidEmails.map((e, i) => (
                                                <Badge key={i} variant="destructive" className="font-mono text-xs">
                                                    {e.email}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Document Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Document Information</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="documentType">Document Type</Label>
                                    <Input
                                        id="documentType"
                                        value={documentType}
                                        onChange={(e) => setDocumentType(e.target.value)}
                                        placeholder="e.g., Memo, Notice"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="period">Period/Date</Label>
                                    <Input
                                        id="period"
                                        value={period}
                                        onChange={(e) => setPeriod(e.target.value)}
                                        placeholder="e.g., January 2024"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Email Customization */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Email Content</h4>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emailSubject">Subject Line</Label>
                                <Input
                                    ref={subjectRef}
                                    id="emailSubject"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Email subject..."
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    {AVAILABLE_PLACEHOLDERS.filter(p => p.key !== "{{recipientName}}").map(p => (
                                        <PlaceholderChip
                                            key={p.key}
                                            placeholder={p.key}
                                            label={p.label}
                                            description={p.description}
                                            onClick={() => insertPlaceholder(p.key, "subject")}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emailBody">Message Body</Label>
                                <Textarea
                                    ref={bodyRef}
                                    id="emailBody"
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    placeholder="Email body..."
                                    rows={6}
                                    className="resize-none font-mono text-sm"
                                />
                                <div className="flex flex-wrap gap-1.5">
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
                    </div>

                    {/* Right: Preview */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Email Preview</h4>
                        <EmailPreview
                            subject={emailSubject}
                            body={emailBody}
                            recipientName={validEmails[0]?.email.split("@")[0] || "Recipient"}
                            documentType={documentType}
                            period={period}
                            organizationName={organizationName}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={validEmails.length === 0}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        Send to {validEmails.length} Recipient{validEmails.length !== 1 ? "s" : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
