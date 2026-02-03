import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SMTPClient } from "@/lib/email/smtp-client";
import { generateEmailContent, textToHtml } from "@/lib/email/email-templates";
import { createErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";
import { applyDataToBlocks } from "@/lib/template-utils";
import { pdf } from "@react-pdf/renderer";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";
import { getDeepValue } from "@/lib/object-utils";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

const batchSendSchema = z.object({
    batchData: z.array(z.record(z.string(), z.any())),
    documentType: z.string().optional(),
    period: z.string().optional(),
    emailField: z.string().optional().nullable(),
    nameField: z.string().optional().nullable(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    providerId: z.string().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id: templateId } = await params;

        if (!context) {
            logWarn("Failed to send batch emails: unauthorized", {
                action: "batch_send_emails",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Check permission - only OWNER and ADMIN can send emails
        if (!hasPermission(context.currentMembership.role, "templates:send")) {
            logWarn("Failed to send batch emails: insufficient permissions", {
                userId: context.user.id,
                organizationId: context.currentMembership.organization.id,
                role: context.currentMembership.role,
                action: "batch_send_emails",
            });
            return createForbiddenResponse("You don't have permission to send emails");
        }

        // Parse and validate request body
        const body = await request.json();
        const validated = batchSendSchema.parse(body);

        // Get template
        const template = await prisma.template.findFirst({
            where: {
                id: templateId,
                organizationId: context.currentMembership.organization.id,
            },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Get SMTP configuration
        let smtpConfig;

        if (validated.providerId) {
            // Fetch specific provider
            smtpConfig = await prisma.sMTPConfiguration.findFirst({
                where: {
                    id: validated.providerId,
                    organizationId: context.currentMembership.organization.id,
                },
                include: {
                    provider: true,
                },
            });
        } else {
            // Fetch default provider
            smtpConfig = await prisma.sMTPConfiguration.findFirst({
                where: {
                    organizationId: context.currentMembership.organization.id,
                    isDefault: true,
                },
                include: {
                    provider: true,
                },
            });

            // If no default, get any provider
            if (!smtpConfig) {
                smtpConfig = await prisma.sMTPConfiguration.findFirst({
                    where: {
                        organizationId: context.currentMembership.organization.id,
                    },
                    include: {
                        provider: true,
                    },
                });
            }
        }

        if (!smtpConfig) {
            return NextResponse.json(
                { error: "Email configuration not found. Please set up SMTP in Settings." },
                { status: 400 }
            );
        }

        // Helper to get value - tries direct access first, then deep path
        const getValue = (record: any, field: string | null | undefined): any => {
            if (!field) return undefined;
            // First try direct property access (handles keys like "{{employee.email}}")
            if (record[field] !== undefined) return record[field];
            // Fall back to deep path access (handles nested paths like "employee.email")
            return getDeepValue(record, field);
        };

        // Helper to get email from record
        const getEmail = (record: any) => {
            if (validated.emailField) {
                return getValue(record, validated.emailField);
            }
            return record.Email || record.email || record["{{employee.email}}"];
        };

        // Validate that all records have an Email field
        const recordsWithoutEmail = validated.batchData.filter((record) => !getEmail(record));
        if (recordsWithoutEmail.length > 0) {
            return NextResponse.json(
                {
                    error: `${recordsWithoutEmail.length} record(s) are missing an Email field`,
                },
                { status: 400 }
            );
        }

        // Initialize SMTP client
        const smtpClient = new SMTPClient({
            smtpServer: smtpConfig.provider.smtpServer,
            smtpPort: smtpConfig.provider.smtpPort,
            useTLS: smtpConfig.provider.useTLS,
            senderEmail: smtpConfig.senderEmail,
            senderName: smtpConfig.senderName,
            smtpUsername: smtpConfig.smtpUsername,
            smtpPassword: smtpConfig.smtpPassword,
        });

        // Connect to SMTP server
        const connectResult = await smtpClient.connect();
        if (!connectResult.success) {
            return NextResponse.json(
                { error: `Failed to connect to email server: ${connectResult.message}` },
                { status: 500 }
            );
        }

        // Send emails with PDFs
        let sent = 0;
        let failed = 0;
        const errors: Array<{ email: string; error: string }> = [];

        for (const record of validated.batchData) {
            try {
                // Generate PDF for this record
                if (!template.schema) {
                    throw new Error("Template schema is missing");
                }

                const schema = template.schema as any;
                const substitutedBlocks = applyDataToBlocks(
                    schema.blocks,
                    record
                );

                // Pre-process blocks to convert remote image URLs to data URLs
                const processedBlocks = await preprocessBlocksForPdf(substitutedBlocks);

                const pdfDocument = (
                    <TemplatePDF
                        blocks={processedBlocks}
                        globalStyles={schema.globalStyles}
                        paperSize={template.paperSize}
                        orientation={template.orientation}
                    />
                );

                const pdfBlob = await pdf(pdfDocument).toBlob();
                const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

                // Generate email content
                const recipientEmail = getEmail(record);
                // Get recipient name from specified field or fallback
                const recipientName = validated.nameField
                    ? getValue(record, validated.nameField) || recipientEmail.split("@")[0]
                    : record.Name || record["{{employee.fullName}}"] || record["{{employee.firstName}}"] || recipientEmail.split("@")[0];

                // Use custom email content if provided, otherwise fall back to SMTP config
                const emailContent = generateEmailContent(
                    validated.emailSubject || smtpConfig.emailSubject,
                    validated.emailBody || smtpConfig.emailBody,
                    {
                        recipientName,
                        documentType: validated.documentType || "Document",
                        period: validated.period || "current period",
                        organizationName: context.currentMembership.organization.name,
                    }
                );

                // Send email
                const emailResult = await smtpClient.sendEmail({
                    to: recipientEmail,
                    subject: emailContent.subject,
                    text: emailContent.body,
                    html: textToHtml(emailContent.body),
                    attachments: [
                        {
                            filename: `${template.name}-${recipientName}.pdf`,
                            content: pdfBuffer,
                            contentType: "application/pdf",
                        },
                    ],
                });

                if (emailResult.success) {
                    sent++;
                } else {
                    failed++;
                    errors.push({
                        email: recipientEmail,
                        error: emailResult.message,
                    });
                }
            } catch (error) {
                failed++;
                // Try to get email for error logging even if it failed
                const email = getDeepValue(record, validated.emailField || "Email") || "Unknown";
                errors.push({
                    email,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        // Disconnect from SMTP server
        await smtpClient.disconnect();

        logInfo("Batch emails sent", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            templateId,
            sent,
            failed,
            action: "batch_send_emails",
        });

        // Log audit event
        await logAuditEvent({
            action: "PAYSLIP_BATCH_SENT",
            user: createAuditUserContext(context),
            resource: {
                type: "template",
                id: templateId,
                name: template.name,
            },
            metadata: {
                totalRecipients: validated.batchData.length,
                sent,
                failed,
                documentType: validated.documentType,
                period: validated.period,
            },
        });

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: validated.batchData.length,
            errors,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }

        logError(
            "Failed to send batch emails",
            error instanceof Error ? error : new Error(String(error)),
            { action: "batch_send_emails" }
        );
        return createErrorResponse(error, "Failed to send batch emails", 500);
    }
}
