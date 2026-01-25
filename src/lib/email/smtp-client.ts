import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { decrypt } from "./encryption";

export interface SMTPConfig {
    smtpServer: string;
    smtpPort: number;
    useTLS: boolean;
    senderEmail: string;
    senderName?: string | null;
    smtpUsername: string;
    smtpPassword: string; // Encrypted
}

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
    }>;
}

export class SMTPClient {
    private transporter: Transporter | null = null;
    private config: SMTPConfig;

    constructor(config: SMTPConfig) {
        this.config = config;
    }

    /**
     * Create and verify SMTP connection
     */
    async connect(): Promise<{ success: boolean; message: string }> {
        try {
            // Decrypt password
            const password = decrypt(this.config.smtpPassword);

            // Create transporter
            this.transporter = nodemailer.createTransport({
                host: this.config.smtpServer,
                port: this.config.smtpPort,
                secure: this.config.smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: this.config.smtpUsername,
                    pass: password,
                },
                tls: {
                    rejectUnauthorized: this.config.useTLS,
                },
            });

            // Verify connection
            await this.transporter.verify();

            return {
                success: true,
                message: "SMTP connection established successfully",
            };
        } catch (error) {
            console.error("SMTP connection error:", error);

            if (error instanceof Error) {
                // Handle specific SMTP errors
                if (error.message.includes("authentication") || error.message.includes("Invalid login")) {
                    return {
                        success: false,
                        message: "Authentication failed. Please check your email and password.",
                    };
                }
                if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
                    return {
                        success: false,
                        message: "Could not connect to SMTP server. Please check server address and port.",
                    };
                }
            }

            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to connect to SMTP server",
            };
        }
    }

    /**
     * Send a single email
     */
    async sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
        if (!this.transporter) {
            const connectResult = await this.connect();
            if (!connectResult.success) {
                return connectResult;
            }
        }

        try {
            const info = await this.transporter!.sendMail({
                from: this.config.senderName
                    ? `"${this.config.senderName}" <${this.config.senderEmail}>`
                    : this.config.senderEmail,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
            });

            return {
                success: true,
                message: `Email sent successfully. Message ID: ${info.messageId}`,
            };
        } catch (error) {
            console.error("Email send error:", error);

            if (error instanceof Error) {
                // Handle quota/rate limit errors
                if (
                    error.message.includes("quota") ||
                    error.message.includes("limit") ||
                    error.message.includes("550") ||
                    error.message.includes("554")
                ) {
                    return {
                        success: false,
                        message: "Email quota exceeded. Daily sending limit reached.",
                    };
                }
            }

            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to send email",
            };
        }
    }

    /**
     * Send batch emails with progress callback
     */
    async sendBatchEmails(
        emails: EmailOptions[],
        onProgress?: (sent: number, total: number, currentEmail: string) => void
    ): Promise<{
        success: boolean;
        sent: number;
        failed: number;
        errors: Array<{ email: string; error: string }>;
    }> {
        // Ensure connection
        const connectResult = await this.connect();
        if (!connectResult.success) {
            return {
                success: false,
                sent: 0,
                failed: emails.length,
                errors: emails.map((e) => ({
                    email: e.to,
                    error: connectResult.message,
                })),
            };
        }

        let sent = 0;
        let failed = 0;
        const errors: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const result = await this.sendEmail(email);

            if (result.success) {
                sent++;
            } else {
                failed++;
                errors.push({
                    email: email.to,
                    error: result.message,
                });
            }

            // Call progress callback
            if (onProgress) {
                onProgress(sent + failed, emails.length, email.to);
            }

            // Small delay to avoid rate limiting (100ms between emails)
            if (i < emails.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return {
            success: sent > 0,
            sent,
            failed,
            errors,
        };
    }

    /**
     * Close SMTP connection
     */
    async disconnect(): Promise<void> {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
        }
    }
}

/**
 * Test SMTP connection without creating a persistent client
 */
export async function testSMTPConnection(
    config: SMTPConfig
): Promise<{ success: boolean; message: string }> {
    const client = new SMTPClient(config);
    const result = await client.connect();
    await client.disconnect();
    return result;
}
