"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import { toast } from "sonner";
import { getDeepValue } from "@/lib/object-utils";
import {
    WizardStep,
    RecipientRecord,
    SendResult,
    DEFAULT_EMAIL_SUBJECT,
    DEFAULT_EMAIL_BODY,
} from "./email-send-wizard";
import { RecipientStep } from "./email-send-wizard/recipient-step";
import { CustomizeStep } from "./email-send-wizard/customize-step";
import { ConfirmStep } from "./email-send-wizard/confirm-step";

interface BatchSendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templateId: string;
    records: Record<string, any>[];
    emailField?: string | null;
    nameField?: string | null;
    defaultSubject?: string;
    defaultBody?: string;
    organizationName?: string;
}

const STEP_TITLES: Record<WizardStep, string> = {
    recipients: "Review Recipients",
    customize: "Customize Email",
    confirm: "Confirm & Send",
    sending: "Sending...",
    complete: "Complete",
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
    recipients: "Review and verify email addresses before sending",
    customize: "Personalize the email subject and message",
    confirm: "Review your settings and send emails",
    sending: "Please wait while emails are being sent",
    complete: "Email sending complete",
};

export function BatchSendDialog({
    open,
    onOpenChange,
    templateId,
    records,
    emailField: initialEmailField,
    nameField: initialNameField,
    defaultSubject,
    defaultBody,
    organizationName = "Your Organization",
}: BatchSendDialogProps) {
    // Wizard state
    const [step, setStep] = useState<WizardStep>("recipients");
    const [emailField, setEmailField] = useState<string | null>(initialEmailField || null);
    const [nameField, setNameField] = useState<string | null>(initialNameField || null);
    const [emailSubject, setEmailSubject] = useState(defaultSubject || DEFAULT_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(defaultBody || DEFAULT_EMAIL_BODY);
    const [documentType, setDocumentType] = useState("Payslip");
    const [period, setPeriod] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);

    // Provider state
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    // Manual recipients state
    const [manualRecipientsInput, setManualRecipientsInput] = useState("");
    const [isManualMode, setIsManualMode] = useState(false);

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
                        // Select default provider
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

    // Get available fields from records
    const availableFields = useMemo(() => {
        if (records.length === 0) return [];
        return Object.keys(records[0]);
    }, [records]);

    // Auto-detect email field if not provided
    useEffect(() => {
        if (!emailField && availableFields.length > 0) {
            const detected = availableFields.find(
                f => f.toLowerCase().includes("email")
            );
            if (detected) setEmailField(detected);
        }
    }, [availableFields, emailField]);

    // Auto-detect name field if not provided
    useEffect(() => {
        if (!nameField && availableFields.length > 0) {
            const detected = availableFields.find(
                f => f.toLowerCase().includes("name") && !f.toLowerCase().includes("email")
            );
            if (detected) setNameField(detected);
        }
    }, [availableFields, nameField]);

    // Helper to get value from record - tries direct access first, then deep path
    const getValue = (data: Record<string, any>, field: string | null | undefined): any => {
        if (!field) return undefined;
        // First try direct property access (handles keys like "{{employee.email}}")
        if (data[field] !== undefined) return data[field];
        // Fall back to deep path access (handles nested paths like "employee.email")
        return getDeepValue(data, field);
    };

    // Build recipients list (Automatic Mode)
    const recipients: RecipientRecord[] = useMemo(() => {
        return records.map((data, index) => {
            const email = emailField
                ? getValue(data, emailField)
                : (data.Email || data.email || data["{{employee.email}}"]);
            const name = nameField
                ? getValue(data, nameField)
                : (data.Name || data.name || data["{{employee.fullName}}"] || data["{{employee.firstName}}"]);

            const isValidEmail = typeof email === "string" && email.includes("@");

            return {
                index,
                data,
                email: email || null,
                name: name || null,
                isValid: isValidEmail,
            };
        });
    }, [records, emailField, nameField]);

    const validRecipients = useMemo(
        () => recipients.filter(r => r.isValid),
        [recipients]
    );

    // Auto-switch to manual mode if no valid emails found
    useEffect(() => {
        if (open && validRecipients.length === 0 && recipients.length > 0) {
            setIsManualMode(true);
        }
    }, [open, validRecipients.length, recipients.length]);

    // Parse manual recipients
    // Email validation regex
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const parsedManualRecipients = useMemo(() => {
        if (!manualRecipientsInput.trim()) return [];
        return manualRecipientsInput
            .split(/[,;\n\s]+/)
            .map(e => e.trim())
            .filter(e => e.length > 0)
            .map(email => ({
                email,
                isValid: EMAIL_REGEX.test(email)
            }));
    }, [manualRecipientsInput]);

    const validManualRecipients = parsedManualRecipients.filter(r => r.isValid);

    // Get first valid recipient for preview
    const previewName = useMemo(
        () => {
            if (isManualMode) {
                return validManualRecipients[0]?.email.split("@")[0] || "Recipient";
            }
            return validRecipients[0]?.name || "Recipient";
        },
        [validRecipients, isManualMode, validManualRecipients]
    );

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setStep("recipients");
            setEmailField(initialEmailField || null);
            setNameField(initialNameField || null);
            setEmailSubject(defaultSubject || DEFAULT_EMAIL_SUBJECT);
            setEmailBody(defaultBody || DEFAULT_EMAIL_BODY);
            setDocumentType("Payslip");
            setPeriod("");
            setResult(null);
            setManualRecipientsInput("");
            setIsManualMode(false);
        }
    }, [open, initialEmailField, initialNameField, defaultSubject, defaultBody]);



    // Navigation
    const canProceed = useCallback(() => {
        switch (step) {
            case "recipients":
                return isManualMode ? validManualRecipients.length > 0 : validRecipients.length > 0;
            case "customize":
                return emailSubject.trim().length > 0 && !!selectedProviderId;
            case "confirm":
                return !isSending;
            default:
                return false;
        }
    }, [step, validRecipients.length, emailSubject, isSending, selectedProviderId, isManualMode, validManualRecipients.length]);

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
            let finalBatchData;

            if (isManualMode) {
                // Cartesian Product: Each Record gets sent to Each Manual Recipient
                finalBatchData = [];
                for (const record of records) {
                    for (const recipient of validManualRecipients) {
                        const newRecord = { ...record };
                        // Force set the email/name for this send instance
                        newRecord["Email"] = recipient.email;
                        // If provided name field exists, we leave it, otherwise default to email prefix
                        if (!nameField || !newRecord[nameField]) {
                            newRecord["Name"] = recipient.email.split("@")[0];
                        }
                        finalBatchData.push(newRecord);
                    }
                }
            } else {
                finalBatchData = validRecipients.map(r => r.data);
            }

            // Check if we should use single send or batch send
            if (finalBatchData.length === 1) {
                const record = finalBatchData[0];
                const email = record["Email"] || record[emailField || ""] || record["{{employee.email}}"];
                const name = record["Name"] || record[nameField || ""] || record["{{employee.fullName}}"];

                const response = await fetch(`/api/templates/${templateId}/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        data: record,
                        recipientEmail: email,
                        recipientName: name,
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
                // Batch Send
                const response = await fetch(`/api/templates/${templateId}/batch-send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        batchData: finalBatchData,
                        documentType,
                        period,
                        emailField: isManualMode ? "Email" : emailField, // Force "Email" key if manual
                        nameField: isManualMode ? (nameField || "Name") : nameField,
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
            console.error("Failed to send batch emails:", error);
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
                    {step === "recipients" && (
                        <RecipientStep
                            recipients={recipients}
                            emailField={emailField}
                            nameField={nameField}
                            onEmailFieldChange={setEmailField}
                            onNameFieldChange={setNameField}
                            availableFields={availableFields}

                            isManualMode={isManualMode}
                            onManualModeToggle={setIsManualMode}
                            manualRecipientsInput={manualRecipientsInput}
                            onManualRecipientsChange={setManualRecipientsInput}
                            parsedManualRecipients={parsedManualRecipients}
                        />
                    )}

                    {step === "customize" && (
                        <CustomizeStep
                            emailSubject={emailSubject}
                            emailBody={emailBody}
                            documentType={documentType}
                            period={period}
                            onSubjectChange={setEmailSubject}
                            onBodyChange={setEmailBody}
                            onDocumentTypeChange={setDocumentType}
                            onPeriodChange={setPeriod}
                            previewName={previewName}
                            organizationName={organizationName}
                            providers={providers}
                            selectedProviderId={selectedProviderId}
                            onProviderSelect={setSelectedProviderId}
                        />
                    )}

                    {(step === "confirm" || step === "sending" || step === "complete") && (
                        <ConfirmStep
                            recipients={recipients}
                            emailSubject={emailSubject}
                            documentType={documentType}
                            period={period}
                            organizationName={organizationName}
                            isSending={isSending}
                            result={result}
                        />
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
                                                Send {isManualMode ? validManualRecipients.length * records.length : validRecipients.length} Email{(isManualMode ? validManualRecipients.length * records.length : validRecipients.length) !== 1 ? "s" : ""}
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
