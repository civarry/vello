export type WizardStep = "recipients" | "customize" | "confirm" | "sending" | "complete";

export interface RecipientRecord {
    index: number;
    data: Record<string, any>;
    email: string | null;
    name: string | null;
    isValid: boolean;
}

export interface WizardState {
    step: WizardStep;
    recipients: RecipientRecord[];
    emailField: string | null;
    nameField: string | null;
    emailSubject: string;
    emailBody: string;
    documentType: string;
    period: string;
}

export interface SendResult {
    sent: number;
    failed: number;
    total: number;
    errors: Array<{ email: string; error: string }>;
}

export const DEFAULT_EMAIL_SUBJECT = "Your {{documentType}} for {{period}}";
export const DEFAULT_EMAIL_BODY = `Dear {{recipientName}},

Please find attached your {{documentType}} for {{period}}.

If you have any questions, please don't hesitate to reach out.

Best regards,
{{organizationName}}`;

export const AVAILABLE_PLACEHOLDERS = [
    { key: "{{recipientName}}", label: "Recipient Name", description: "Name of the recipient" },
    { key: "{{documentType}}", label: "Document Type", description: "Type of document (e.g., Payslip)" },
    { key: "{{period}}", label: "Period", description: "Pay period (e.g., January 2024)" },
    { key: "{{organizationName}}", label: "Organization", description: "Your company name" },
] as const;
