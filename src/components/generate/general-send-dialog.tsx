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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    Send,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Mail,
    FileText,
    Calendar,
    Building,
    Server,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import {
    DEFAULT_GENERAL_EMAIL_SUBJECT,
    DEFAULT_GENERAL_EMAIL_BODY,
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

type WizardStep = "recipients" | "customize" | "confirm" | "sending" | "complete";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERAL_PLACEHOLDERS = AVAILABLE_PLACEHOLDERS.filter(p => p.key !== "{{recipientName}}");

const STEP_TITLES: Record<WizardStep, string> = {
    recipients: "Add Recipients",
    customize: "Customize Email",
    confirm: "Confirm & Send",
    sending: "Sending...",
    complete: "Complete",
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
    recipients: "Enter the email addresses to send to",
    customize: "Personalize the email subject and message",
    confirm: "Review your settings and send",
    sending: "Please wait while emails are being sent",
    complete: "Email sending complete",
};

export function GeneralSendDialog({
    open,
    onOpenChange,
    templateId,
    templateName,
    defaultSubject,
    defaultBody,
    organizationName = "Your Organization",
}: GeneralSendDialogProps) {
    // Wizard state
    const [step, setStep] = useState<WizardStep>("recipients");
    const [recipientInput, setRecipientInput] = useState("");
    const [emailSubject, setEmailSubject] = useState(defaultSubject || DEFAULT_GENERAL_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(defaultBody || DEFAULT_GENERAL_EMAIL_BODY);
    const [documentType, setDocumentType] = useState("Document");
    const [period, setPeriod] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);

    // Provider state
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const [activeField, setActiveField] = useState<"subject" | "body">("body");

    // Fetch providers on open
    useEffect(() => {
        if (open) {
            const fetchProviders = async () => {
                try {
                    setIsLoadingProviders(true);
                    const response = await fetch("/api/smtp/config");
                    const data = await response.json();

                    if (response.ok && data.data) {
                        setProviders(data.data);
                        const defaultProvider = data.data.find((p: any) => p.isDefault) || data.data[0];
                        if (defaultProvider) {
                            setSelectedProviderId(defaultProvider.id);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch SMTP configs:", error);
                } finally {
                    setIsLoadingProviders(false);
                }
            };
            fetchProviders();
        }
    }, [open]);

    const parsedEmails = useMemo(() => {
        if (!recipientInput.trim()) return [];
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
            setStep("recipients");
            setRecipientInput("");
            setEmailSubject(defaultSubject || DEFAULT_GENERAL_EMAIL_SUBJECT);
            setEmailBody(defaultBody || DEFAULT_GENERAL_EMAIL_BODY);
            setDocumentType("Document");
            setPeriod("");
            setResult(null);
        }
    }, [open, defaultSubject, defaultBody]);

    const insertPlaceholder = (placeholder: string) => {
        const ref = activeField === "subject" ? subjectRef : bodyRef;
        const setter = activeField === "subject" ? setEmailSubject : setEmailBody;
        const currentValue = activeField === "subject" ? emailSubject : emailBody;

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

    // Navigation
    const canProceed = () => {
        switch (step) {
            case "recipients":
                return validEmails.length > 0;
            case "customize":
                return emailSubject.trim().length > 0 && !!selectedProviderId;
            case "confirm":
                return !isSending;
            default:
                return false;
        }
    };

    const goNext = () => {
        switch (step) {
            case "recipients":
                setStep("customize");
                break;
            case "customize":
                setStep("confirm");
                break;
            case "confirm":
                handleSend();
                break;
        }
    };

    const goBack = () => {
        switch (step) {
            case "customize":
                setStep("recipients");
                break;
            case "confirm":
                setStep("customize");
                break;
        }
    };

    const handleSend = async () => {
        setIsSending(true);
        setStep("sending");

        try {
            // Use single-send endpoint for 1 recipient, batch-send for multiple
            if (validEmails.length === 1) {
                const { email } = validEmails[0];
                const response = await fetch(`/api/templates/${templateId}/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        data: {},
                        recipientEmail: email,
                        recipientName: email.split("@")[0],
                        documentType,
                        period,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to send email");
                }

                setResult({
                    sent: 1,
                    failed: 0,
                    total: 1,
                    errors: [],
                });
                setStep("complete");
                toast.success("Email sent successfully!");
            } else {
                // Batch send for multiple recipients
                const batchData = validEmails.map(({ email }) => ({
                    Email: email,
                    Name: email.split("@")[0],
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
                        providerId: selectedProviderId,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to send emails");
                }

                setResult(data);
                setStep("complete");

                if (data.failed === 0) {
                    toast.success(`Successfully sent ${data.sent} email(s)!`);
                } else if (data.sent > 0) {
                    toast.warning(`Sent ${data.sent} email(s), ${data.failed} failed`);
                } else {
                    toast.error("Failed to send emails");
                }
            }
        } catch (error) {
            console.error("Failed to send emails:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send emails");
            setStep("confirm");
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        if (!isSending) {
            onOpenChange(false);
        }
    };

    // Preview subject with placeholders replaced
    const previewSubject = emailSubject
        .replace(/\{\{documentType\}\}/g, documentType || "Document")
        .replace(/\{\{period\}\}/g, period || "this period")
        .replace(/\{\{organizationName\}\}/g, organizationName);

    const selectedProvider = providers.find(p => p.id === selectedProviderId);

    // Determine dialog size based on step
    const dialogClass = step === "customize"
        ? "!max-w-6xl w-[95vw] max-h-[85vh] flex flex-col"
        : "!max-w-4xl w-[90vw] max-h-[85vh] flex flex-col";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={dialogClass}>
                <DialogHeader>
                    <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
                    <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
                </DialogHeader>

                {/* Step Content */}
                <div className="py-4 overflow-y-auto flex-1 min-h-0">
                    {/* Recipients Step */}
                    {step === "recipients" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="recipients">Email Addresses</Label>
                                <Textarea
                                    id="recipients"
                                    value={recipientInput}
                                    onChange={(e) => setRecipientInput(e.target.value)}
                                    placeholder="Enter email addresses (comma, newline, or space separated)"
                                    rows={6}
                                    className="resize-none font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Separate multiple emails with commas, newlines, or spaces
                                </p>
                            </div>

                            {/* Email validation feedback */}
                            {parsedEmails.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            {validEmails.length} valid
                                        </span>
                                        {invalidEmails.length > 0 && (
                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <XCircle className="h-4 w-4" />
                                                {invalidEmails.length} invalid
                                            </span>
                                        )}
                                    </div>

                                    {invalidEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {invalidEmails.slice(0, 10).map((e, i) => (
                                                <Badge key={i} variant="destructive" className="font-mono text-xs">
                                                    {e.email}
                                                </Badge>
                                            ))}
                                            {invalidEmails.length > 10 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{invalidEmails.length - 10} more
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {validEmails.length > 0 && (
                                        <div className="rounded-lg border bg-muted/20 p-3">
                                            <p className="text-xs text-muted-foreground mb-2">Valid recipients:</p>
                                            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                                                {validEmails.slice(0, 20).map((e, i) => (
                                                    <Badge key={i} variant="secondary" className="font-normal text-xs">
                                                        {e.email}
                                                    </Badge>
                                                ))}
                                                {validEmails.length > 20 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{validEmails.length - 20} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customize Step */}
                    {step === "customize" && (
                        <div className="grid grid-cols-2 gap-6 h-full">
                            {/* Left: Form */}
                            <div className="space-y-4 overflow-y-auto pr-2">
                                {/* Sender Selection */}
                                <div className="space-y-2">
                                    <Label className="text-xs">Send As</Label>
                                    {providers.length > 0 ? (
                                        <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
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
                                            onChange={(e) => setDocumentType(e.target.value)}
                                            placeholder="e.g., Memo"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="period" className="text-xs">Period</Label>
                                        <Input
                                            id="period"
                                            value={period}
                                            onChange={(e) => setPeriod(e.target.value)}
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
                                        onChange={(e) => setEmailSubject(e.target.value)}
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
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        onFocus={() => setActiveField("body")}
                                        placeholder="Email body..."
                                        rows={6}
                                        className={`resize-none font-mono text-sm ${activeField === "body" ? "ring-2 ring-primary/20 border-primary" : ""}`}
                                    />
                                </div>

                                {/* Placeholders */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Insert into <strong>{activeField === "subject" ? "Subject" : "Body"}</strong>:
                                    </Label>
                                    <div className="flex flex-wrap gap-1">
                                        {GENERAL_PLACEHOLDERS.map(p => (
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
                                    recipientName="Recipient"
                                    documentType={documentType}
                                    period={period}
                                    organizationName={organizationName}
                                />
                            </div>
                        </div>
                    )}

                    {/* Confirm / Sending / Complete Steps */}
                    {(step === "confirm" || step === "sending" || step === "complete") && (
                        <>
                            {/* Sending state */}
                            {step === "sending" && (
                                <div className="py-12 space-y-6">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                            <Send className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-lg font-medium">Sending emails...</p>
                                            <p className="text-sm text-muted-foreground">
                                                Generating PDFs and sending to {validEmails.length} recipient{validEmails.length !== 1 ? "s" : ""}.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Please don&apos;t close this dialog.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Results state */}
                            {step === "complete" && result && (
                                <div className="space-y-6">
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

                                    {result.failed === 0 && (
                                        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription className="text-green-800 dark:text-green-200">
                                                All {result.sent} email{result.sent !== 1 ? "s" : ""} sent successfully!
                                            </AlertDescription>
                                        </Alert>
                                    )}

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
                            )}

                            {/* Confirmation state (before sending) */}
                            {step === "confirm" && (
                                <div className="space-y-6">
                                    <div className="rounded-lg border bg-muted/20 p-6 space-y-4">
                                        <h4 className="font-medium">Ready to Send</h4>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-3">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-muted-foreground">Recipients</p>
                                                    <p className="font-medium">{validEmails.length} email{validEmails.length !== 1 ? "s" : ""}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-muted-foreground">Document</p>
                                                    <p className="font-medium">{templateName}</p>
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

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Recipients ({validEmails.length})</p>
                                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 rounded-lg border bg-muted/10">
                                            {validEmails.map((e, idx) => (
                                                <Badge key={idx} variant="secondary" className="font-normal">
                                                    {e.email}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter>
                    {/* Progress indicator */}
                    {step !== "sending" && step !== "complete" && (
                        <div className="flex-1 flex items-center gap-2">
                            {["recipients", "customize", "confirm"].map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${["recipients", "customize", "confirm"].indexOf(step) >= i
                                        ? "bg-primary"
                                        : "bg-muted"
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Navigation buttons */}
                    {step !== "sending" && (
                        <div className="flex gap-2">
                            {step === "complete" ? (
                                <Button onClick={handleClose}>Close</Button>
                            ) : (
                                <>
                                    {step !== "recipients" && (
                                        <Button variant="outline" onClick={goBack}>
                                            <ChevronLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                    )}
                                    {step === "recipients" && (
                                        <Button variant="outline" onClick={handleClose}>
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        onClick={goNext}
                                        disabled={!canProceed()}
                                    >
                                        {step === "confirm" ? (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send {validEmails.length} Email{validEmails.length !== 1 ? "s" : ""}
                                            </>
                                        ) : (
                                            <>
                                                Next
                                                <ChevronRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
