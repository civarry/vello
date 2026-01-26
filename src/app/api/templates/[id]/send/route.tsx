import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SMTPClient } from "@/lib/email/smtp-client";
import { generateEmailContent, textToHtml } from "@/lib/email/email-templates";
import { createErrorResponse, createUnauthorizedResponse } from "@/lib/errors";
import { logInfo, logError, logWarn } from "@/lib/logging";
import { z } from "zod";
import { applyDataToBlocks } from "@/lib/template-utils";
import { pdf } from "@react-pdf/renderer";
import { TemplatePDF, preprocessBlocksForPdf } from "@/lib/pdf/template-pdf";

const sendSchema = z.object({
    data: z.record(z.string(), z.any()),
    recipientEmail: z.string().email(),
    recipientName: z.string().optional(),
    documentType: z.string().optional(),
    period: z.string().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { context, error } = await getCurrentUser();
        const { id: templateId } = await params;

        if (!context) {
            logWarn("Failed to send email: unauthorized", {
                action: "send_email",
            });
            return createUnauthorizedResponse(error || "Unauthorized");
        }

        // Parse and validate request body
        const body = await request.json();
        const validated = sendSchema.parse(body);

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
        // Get SMTP configuration
        // Try to find default config first
        let smtpConfig = await prisma.sMTPConfiguration.findFirst({
            where: {
                organizationId: context.currentMembership.organization.id,
                isDefault: true,
            },
            include: {
                provider: true,
            },
        });

        // If no default, try to find any config
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

        if (!smtpConfig) {
            return NextResponse.json(
                { error: "Email configuration not found. Please set up SMTP in Settings." },
                { status: 400 }
            );
        }

        // Generate PDF
        if (!template.schema) {
            return NextResponse.json(
                { error: "Template schema is missing" },
                { status: 500 }
            );
        }

        const schema = template.schema as any;
        const substitutedBlocks = applyDataToBlocks(
            schema.blocks,
            validated.data
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

        // Generate email content
        const recipientName = validated.recipientName || validated.recipientEmail.split("@")[0];
        const emailContent = generateEmailContent(
            smtpConfig.emailSubject,
            smtpConfig.emailBody,
            {
                recipientName,
                documentType: validated.documentType || "Document",
                period: validated.period || "current period",
                organizationName: context.currentMembership.organization.name,
            }
        );

        // Send email
        const emailResult = await smtpClient.sendEmail({
            to: validated.recipientEmail,
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

        // Disconnect from SMTP server
        await smtpClient.disconnect();

        if (!emailResult.success) {
            return NextResponse.json(
                { error: emailResult.message },
                { status: 500 }
            );
        }

        logInfo("Email sent successfully", {
            userId: context.user.id,
            organizationId: context.currentMembership.organization.id,
            templateId,
            recipientEmail: validated.recipientEmail,
            action: "send_email",
        });

        return NextResponse.json({
            success: true,
            message: emailResult.message,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }

        logError(
            "Failed to send email",
            error instanceof Error ? error : new Error(String(error)),
            { action: "send_email" }
        );
        return createErrorResponse(error, "Failed to send email", 500);
    }
}
