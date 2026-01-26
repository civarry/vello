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
    Plus,
    MoreVertical,
    Star,
    Shield,
    Server,
    Clock,
    Pencil,
    MoreHorizontal,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SMTPConfigForm } from "@/components/smtp/smtp-config-form";
import { SMTPTestDialog } from "@/components/smtp/smtp-test-dialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SMTPConfig {
    id: string;
    name: string;
    providerId: string;
    senderEmail: string;
    senderName?: string | null;
    smtpUsername: string;
    emailSubject?: string | null;
    emailBody?: string | null;
    isDefault: boolean;
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
    const [configs, setConfigs] = useState<SMTPConfig[]>([]);
    const [testConfig, setTestConfig] = useState<SMTPConfig | null>(null);
    const [showTestDialog, setShowTestDialog] = useState(false);

    // Delete state
    const [configToDelete, setConfigToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit/Create state
    const [isCreating, setIsCreating] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SMTPConfig | null>(null);

    const fetchConfigs = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/smtp/config");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch configurations");
            }

            setConfigs(data.data || []);
        } catch (error) {
            console.error("Failed to fetch SMTP configs:", error);
            toast.error("Failed to load email settings");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    const handleDelete = async () => {
        if (!configToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/smtp/config/${configToDelete}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete configuration");
            }

            toast.success("Email configuration deleted");
            setConfigs(prev => prev.filter(c => c.id !== configToDelete));
            setConfigToDelete(null);
        } catch (error) {
            console.error("Failed to delete SMTP config:", error);
            toast.error(error instanceof Error ? error.message : "Failed to delete configuration");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const response = await fetch(`/api/smtp/config/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });

            if (!response.ok) {
                throw new Error("Failed to update default configuration");
            }

            // Refetch to ensure state is consistent
            fetchConfigs();
            toast.success("Default configuration updated");
        } catch (error) {
            console.error("Failed to set default:", error);
            toast.error("Failed to set default configuration");
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

    // Show form if creating or editing
    if (isCreating || editingConfig) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col">
                <div className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setIsCreating(false);
                                setEditingConfig(null);
                            }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                                {isCreating ? "New Configuration" : "Edit Configuration"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="mx-auto max-w-3xl p-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isCreating ? "Add Email Configuration" : "Edit Configuration"}</CardTitle>
                                <CardDescription>
                                    {isCreating
                                        ? "Set up a new email provider for sending documents"
                                        : "Update your SMTP settings"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SMTPConfigForm
                                    initialConfig={editingConfig || undefined}
                                    onSuccess={(newConfig) => {
                                        fetchConfigs();
                                        setIsCreating(false);
                                        setEditingConfig(null);
                                        toast.success(isCreating ? "Configuration created" : "Configuration updated");
                                    }}
                                    submitLabel={isCreating ? "Create Configuration" : "Update Configuration"}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
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
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Configuration
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/10">
                <div className="p-6 space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Email Configurations</h1>
                        <p className="text-muted-foreground">
                            Manage multiple SMTP configurations for sending documents.
                        </p>
                    </div>

                    {configs.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <Mail className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Email Configurations</h3>
                                <p className="text-muted-foreground max-w-sm mb-6">
                                    You haven't set up any email providers yet. Add a configuration to start sending documents.
                                </p>
                                <Button onClick={() => setIsCreating(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Configuration
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {configs.map((config) => (
                                <Card key={config.id} className={cn(
                                    "transition-all",
                                    config.isDefault && "border-primary/50 bg-primary/5"
                                )}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "rounded-lg p-3",
                                                    config.isDefault ? "bg-background" : "bg-muted"
                                                )}>
                                                    {/* Provider Icon */}
                                                    {config.provider.name === "Gmail" ? (
                                                        <svg viewBox="0 0 24 24" className="h-6 w-6">
                                                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                                        </svg>
                                                    ) : config.provider.name === "Outlook" ? (
                                                        <svg viewBox="0 0 24 24" className="h-6 w-6">
                                                            <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                                                            <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
                                                        </svg>
                                                    ) : (
                                                        <Server className="h-6 w-6 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-lg">{config.name}</h3>
                                                        {config.isDefault && (
                                                            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                                <Star className="h-3 w-3 fill-primary" />
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1.5">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            {config.senderEmail}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Server className="h-3.5 w-3.5" />
                                                            {config.provider.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setTestConfig(config);
                                                        setShowTestDialog(true);
                                                    }}
                                                >
                                                    <TestTube2 className="mr-2 h-4 w-4" />
                                                    Test
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingConfig(config)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {!config.isDefault && (
                                                            <DropdownMenuItem onClick={() => handleSetDefault(config.id)}>
                                                                <Star className="mr-2 h-4 w-4" />
                                                                Make Default
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setConfigToDelete(config.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Help Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <Card>
                            <CardContent className="p-4 flex gap-4">
                                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2 h-fit">
                                    <svg viewBox="0 0 24 24" className="h-6 w-6">
                                        <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-medium text-sm">Gmail App Password</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Required for Gmail. Enable 2FA, then generate an app password at <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline hover:text-foreground">google.com/apppasswords</a>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex gap-4">
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 h-fit">
                                    <svg viewBox="0 0 24 24" className="h-6 w-6">
                                        <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                                        <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-medium text-sm">Outlook App Password</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Required for Outlook. Enable 2FA, then create an app password in your Microsoft account security settings.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Test Dialog */}
            {testConfig && (
                <SMTPTestDialog
                    open={showTestDialog}
                    onOpenChange={setShowTestDialog}
                    config={testConfig}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!configToDelete} onOpenChange={(open) => !open && setConfigToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Email Configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this configuration? You won't be able to undo this action.
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
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
