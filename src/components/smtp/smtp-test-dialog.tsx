"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Server,
    Mail,
    Shield,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SMTPTestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: {
        senderEmail: string;
        senderName?: string | null;
        smtpUsername: string;
        provider: {
            name: string;
            smtpServer: string;
            smtpPort: number;
            useTLS: boolean;
        };
    };
}

type TestState = "idle" | "password" | "testing" | "success" | "error";

export function SMTPTestDialog({ open, onOpenChange, config }: SMTPTestDialogProps) {
    const [state, setState] = useState<TestState>("idle");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [testMessage, setTestMessage] = useState("");

    const resetDialog = () => {
        setState("idle");
        setPassword("");
        setShowPassword(false);
        setTestMessage("");
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            resetDialog();
        }
        onOpenChange(isOpen);
    };

    const handleStartTest = () => {
        setState("password");
    };

    // Sanitize password by removing spaces
    const sanitizePassword = (pwd: string): string => pwd.replace(/\s/g, "");

    const handleTest = async () => {
        if (!password) {
            toast.error("Please enter your password");
            return;
        }

        const cleanPassword = sanitizePassword(password);

        // Validate password length for Gmail/Outlook
        if ((config.provider.name === "Gmail" || config.provider.name === "Outlook") && cleanPassword.length !== 16) {
            toast.error(`App password must be 16 characters (currently ${cleanPassword.length})`);
            return;
        }

        setState("testing");
        setTestMessage("");

        try {
            const response = await fetch("/api/smtp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    smtpServer: config.provider.smtpServer,
                    smtpPort: config.provider.smtpPort,
                    useTLS: config.provider.useTLS,
                    senderEmail: config.senderEmail,
                    senderName: config.senderName,
                    smtpUsername: config.smtpUsername,
                    smtpPassword: cleanPassword,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setState("success");
                setTestMessage(data.message || "Connection verified successfully!");
                toast.success("SMTP connection successful!");
            } else {
                setState("error");
                setTestMessage(data.message || "Connection failed. Please check your credentials.");
                toast.error("SMTP connection failed");
            }
        } catch (error) {
            console.error("Test failed:", error);
            setState("error");
            setTestMessage(error instanceof Error ? error.message : "An unexpected error occurred");
            toast.error("Failed to test connection");
        }

        // Clear password after test
        setPassword("");
    };

    const handleRetry = () => {
        setState("password");
        setTestMessage("");
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Test SMTP Connection
                    </DialogTitle>
                    <DialogDescription>
                        Verify that your email configuration is working correctly
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Configuration Summary */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="text-sm font-medium">Current Configuration</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Server className="h-3.5 w-3.5" />
                                <span>Provider</span>
                            </div>
                            <div className="font-medium">{config.provider.name}</div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span>Server</span>
                            </div>
                            <div className="font-mono text-xs">
                                {config.provider.smtpServer}:{config.provider.smtpPort}
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Shield className="h-3.5 w-3.5" />
                                <span>Security</span>
                            </div>
                            <div>
                                <Badge variant={config.provider.useTLS ? "default" : "secondary"} className="text-xs">
                                    {config.provider.useTLS ? "TLS" : "Plain"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Idle State */}
                    {state === "idle" && (
                        <div className="text-center py-4 space-y-4">
                            <div className="rounded-full bg-muted w-16 h-16 mx-auto flex items-center justify-center">
                                <Server className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Ready to Test</p>
                                <p className="text-xs text-muted-foreground">
                                    Click the button below to verify your SMTP connection
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Password Input State */}
                    {state === "password" && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                                <div className="flex gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 dark:text-amber-200">
                                        For security, we don't store your password in plain text.
                                        Please enter it to test the connection.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="testPassword">
                                    {config.provider.name === "Gmail" || config.provider.name === "Outlook"
                                        ? "App Password"
                                        : "SMTP Password"}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="testPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && password) {
                                                handleTest();
                                            }
                                        }}
                                        className="pr-10"
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                {(config.provider.name === "Gmail" || config.provider.name === "Outlook") && password && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {sanitizePassword(password).length}/16 characters
                                        {password.includes(" ") && " (spaces will be removed)"}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Testing State */}
                    {state === "testing" && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="relative">
                                <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium">Testing Connection...</p>
                                <p className="text-xs text-muted-foreground">
                                    Connecting to {config.provider.smtpServer}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {state === "success" && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                            Connection Successful
                                        </p>
                                        <p className="text-xs text-green-800 dark:text-green-200">
                                            {testMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center text-xs text-muted-foreground">
                                Your SMTP configuration is working correctly.
                                You can now send emails to recipients.
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {state === "error" && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-red-100 dark:bg-red-900 p-2">
                                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                            Connection Failed
                                        </p>
                                        <p className="text-xs text-red-800 dark:text-red-200">
                                            {testMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                <p className="text-xs font-medium">Troubleshooting Tips:</p>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                                    <li>Verify your password is correct (use app password for Gmail/Outlook)</li>
                                    <li>Check that 2-Factor Authentication is enabled</li>
                                    <li>Ensure your account allows SMTP access</li>
                                    <li>Try regenerating your app password</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {state === "idle" && (
                        <>
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleStartTest}>
                                Start Test
                            </Button>
                        </>
                    )}

                    {state === "password" && (
                        <>
                            <Button variant="outline" onClick={() => setState("idle")}>
                                Back
                            </Button>
                            <Button onClick={handleTest} disabled={!password}>
                                Test Connection
                            </Button>
                        </>
                    )}

                    {state === "testing" && (
                        <Button variant="outline" disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                        </Button>
                    )}

                    {state === "success" && (
                        <Button onClick={() => handleOpenChange(false)}>
                            Done
                        </Button>
                    )}

                    {state === "error" && (
                        <>
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                Close
                            </Button>
                            <Button onClick={handleRetry}>
                                Try Again
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
