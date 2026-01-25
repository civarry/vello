/**
 * Default email template for document sending
 */
export interface EmailTemplate {
    subject: string;
    body: string;
}

/**
 * Template variables that can be used in email templates
 */
export interface EmailTemplateVariables {
    recipientName?: string;
    documentType?: string;
    period?: string;
    organizationName?: string;
    [key: string]: string | undefined;
}

/**
 * Default email template
 */
export const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
    subject: "{{documentType}} for {{period}}",
    body: `Hi {{recipientName}},

Please find attached your {{documentType}} for {{period}}.

If you have any questions, please don't hesitate to contact us.

Best regards,
{{organizationName}}`,
};

/**
 * Replace template variables in a string
 * Variables are in the format {{variableName}}
 */
export function replaceTemplateVariables(
    template: string,
    variables: EmailTemplateVariables
): string {
    let result = template;

    // Replace each variable
    Object.entries(variables).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        result = result.replace(pattern, value || "");
    });

    // Remove any remaining unfilled variables
    result = result.replace(/\{\{[^}]+\}\}/g, "");

    return result;
}

/**
 * Generate email subject from template
 */
export function generateEmailSubject(
    template: string | null | undefined,
    variables: EmailTemplateVariables
): string {
    const subjectTemplate = template || DEFAULT_EMAIL_TEMPLATE.subject;
    return replaceTemplateVariables(subjectTemplate, variables);
}

/**
 * Generate email body from template
 */
export function generateEmailBody(
    template: string | null | undefined,
    variables: EmailTemplateVariables
): string {
    const bodyTemplate = template || DEFAULT_EMAIL_TEMPLATE.body;
    return replaceTemplateVariables(bodyTemplate, variables);
}

/**
 * Generate complete email content
 */
export function generateEmailContent(
    subjectTemplate: string | null | undefined,
    bodyTemplate: string | null | undefined,
    variables: EmailTemplateVariables
): { subject: string; body: string } {
    return {
        subject: generateEmailSubject(subjectTemplate, variables),
        body: generateEmailBody(bodyTemplate, variables),
    };
}

/**
 * Convert plain text email body to HTML
 */
export function textToHtml(text: string): string {
    return text
        .split("\n")
        .map((line) => {
            if (line.trim() === "") {
                return "<br>";
            }
            return `<p>${escapeHtml(line)}</p>`;
        })
        .join("\n");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}
