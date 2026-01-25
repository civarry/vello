"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Loader2,
    ArrowLeft,
    Mail,
    Trash2,
    TestTube2,
    CheckCircle2,
    Settings2,
    AlertTriangle,
    Shield,
    Server,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { SMTPConfigForm } from "@/components/smtp/smtp-config-form";
import { SMTPTestDialog } from "@/components/smtp/smtp-test-dialog";
import { formatDistanceToNow } from "date-fns";

interface SMTPConfig {
    id: string;
    providerId: string;
    senderEmail: string;
    senderName?: string | null;
    smtpUsername: string;
    emailSubject?: string | null;
    emailBody?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    provider: {
        id: string;
        name: string;
        smtpServer: string;
        smtpPort: number;
        useTLS: boolean;
        description?: string | null;
    };
}

export default function EmailSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<SMTPConfig | null>(null);
    const [showTestDialog, setShowTestDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const fetchConfig = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/smtp/config");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch configuration");
            }

            setConfig(data.data);
        } catch (error) {
            console.error("Failed to fetch SMTP config:", error);
            toast.error("Failed to load email settings");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch("/api/smtp/config", {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete configuration");
            }

            toast.success("Email configuration deleted");
            setConfig(null);
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("Failed to delete SMTP config:", error);
            toast.error(error instanceof Error ? error.message : "Failed to delete configuration");
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading email settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/templates">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Email Settings</span>
                    </div>
                </div>
                {config && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTestDialog(true)}
                        >
                            <TestTube2 className="mr-2 h-4 w-4" />
                            Test Connection
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <div className="mx-auto max-w-4xl p-6 space-y-6">
                    {/* Page Header */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Email Configuration</h1>
                        <p className="text-muted-foreground">
                            Configure SMTP settings to send generated documents directly to recipients via email.
                        </p>
                    </div>

                    {config && !isEditing ? (
                        <>
                            {/* Status Card */}
                            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-semibold text-green-900 dark:text-green-100">
                                                Email Configured
                                            </h3>
                                            <p className="text-sm text-green-800 dark:text-green-200">
                                                Your organization is set up to send documents via email using {config.provider.name}.
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
                                            Active
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Configuration Details */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                <Settings2 className="h-5 w-5" />
                                                Configuration Details
                                            </CardTitle>
                                            <CardDescription>
                                                Your current SMTP configuration
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setShowDeleteDialog(true)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Provider Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Provider</div>
                                                <div className="flex items-center gap-2">
                                                    <Server className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{config.provider.name}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">SMTP Server</div>
                                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                                    {config.provider.smtpServer}:{config.provider.smtpPort}
                                                </code>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Security</div>
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                                    <Badge variant={config.provider.useTLS ? "default" : "secondary"}>
                                                        {config.provider.useTLS ? "TLS Enabled" : "No TLS"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Sender Email</div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span>{config.senderEmail}</span>
                                                </div>
                                            </div>
                                            {config.senderName && (
                                                <div>
                                                    <div className="text-sm font-medium text-muted-foreground mb-1">Display Name</div>
                                                    <span>{config.senderName}</span>
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Username</div>
                                                <span>{config.smtpUsername}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Last Updated</div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    {formatDistanceToNow(new Date(config.updatedAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email Template Preview */}
                                    {(config.emailSubject || config.emailBody) && (
                                        <>
                                            <Separator />
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-3">Email Template</div>
                                                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                                    {config.emailSubject && (
                                                        <div>
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Subject</div>
                                                            <div className="text-sm">{config.emailSubject}</div>
                                                        </div>
                                                    )}
                                                    {config.emailBody && (
                                                        <div>
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Body</div>
                                                            <div className="text-sm whitespace-pre-wrap font-mono bg-background rounded p-3 border">
                                                                {config.emailBody}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : config && isEditing ? (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>Edit Configuration</CardTitle>
                                        <CardDescription>
                                            Update your SMTP settings
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <SMTPConfigForm
                                    initialConfig={config}
                                    onSuccess={(newConfig) => {
                                        setConfig(newConfig as SMTPConfig);
                                        setIsEditing(false);
                                        toast.success("Configuration updated");
                                    }}
                                    submitLabel="Update Configuration"
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* No Configuration - Setup Card */}
                            <Card className="border-dashed">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-3">
                                            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-semibold">No Email Configuration</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Set up SMTP to enable sending documents directly to recipients via email.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Setup Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Set Up Email</CardTitle>
                                    <CardDescription>
                                        Configure your email provider to start sending documents
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SMTPConfigForm
                                        onSuccess={(newConfig) => {
                                            setConfig(newConfig as SMTPConfig);
                                            toast.success("Email configuration saved");
                                        }}
                                        submitLabel="Save Configuration"
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Help Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Need Help?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-lg border p-4 space-y-2">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                        </svg>
                                        Gmail Setup
                                    </h4>
                                    <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                                        <li>Enable 2-Factor Authentication</li>
                                        <li>Go to myaccount.google.com/apppasswords</li>
                                        <li>Generate a new app password</li>
                                        <li>Use the 16-character password</li>
                                    </ol>
                                </div>
                                <div className="rounded-lg border p-4 space-y-2">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                                            <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                                            <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
                                        </svg>
                                        Outlook Setup
                                    </h4>
                                    <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                                        <li>Enable 2-Step Verification</li>
                                        <li>Go to account.microsoft.com/security</li>
                                        <li>Create an app password</li>
                                        <li>Use the generated password</li>
                                    </ol>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Test Dialog */}
            {config && (
                <SMTPTestDialog
                    open={showTestDialog}
                    onOpenChange={setShowTestDialog}
                    config={config}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Email Configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove your SMTP settings. You won't be able to send documents via email until you configure it again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Configuration"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
