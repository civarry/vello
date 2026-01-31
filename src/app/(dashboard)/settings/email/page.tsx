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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    ChevronDown,
    ExternalLink,
    Sparkles,
    Send,
    ArrowRight,
    HelpCircle,
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

// Provider icon component to avoid repetition
function ProviderIcon({ provider, size = "md" }: { provider: string; size?: "sm" | "md" | "lg" }) {
    const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";

    if (provider === "Gmail") {
        return (
            <svg viewBox="0 0 24 24" className={sizeClass}>
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
            </svg>
        );
    }
    if (provider === "Outlook") {
        return (
            <svg viewBox="0 0 24 24" className={sizeClass}>
                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
            </svg>
        );
    }
    return <Server className={cn(sizeClass, "text-muted-foreground")} />;
}

// Animated mail icon for empty state
function AnimatedMailIcon() {
    return (
        <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
                <Mail className="h-12 w-12 text-primary" />
                <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
            </div>
        </div>
    );
}

export default function EmailSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [configs, setConfigs] = useState<SMTPConfig[]>([]);
    const [testConfig, setTestConfig] = useState<SMTPConfig | null>(null);
    const [showTestDialog, setShowTestDialog] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

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
            <div className="flex h-full items-center justify-center">
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
            <div className="flex h-full flex-col">
                {/* Form header - only on desktop, mobile uses MobileSettingsNav */}
                <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
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

                {/* Mobile back button */}
                <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setIsCreating(false);
                            setEditingConfig(null);
                        }}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="mx-auto max-w-3xl p-4 md:p-6">
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
        <div className="flex h-full flex-col">
            {/* Unified Header - Desktop */}
            <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-base">Email Settings</h1>
                        <p className="text-xs text-muted-foreground">Manage SMTP configurations for sending documents</p>
                    </div>
                </div>
                {configs.length > 0 && (
                    <Button onClick={() => setIsCreating(true)} className="glow-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Configuration
                    </Button>
                )}
            </div>

            {/* Mobile action button */}
            <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Email Settings</span>
                </div>
                {configs.length > 0 && (
                    <Button size="sm" onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/30">
                <div className="p-4 md:p-6 space-y-4">
                    {configs.length === 0 ? (
                        /* Enhanced Empty State */
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-amber-500/5">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                            <div className="relative flex flex-col items-center justify-center py-16 px-6 text-center">
                                <AnimatedMailIcon />

                                <h2 className="mt-6 text-2xl font-bold tracking-tight">
                                    Start Sending Documents
                                </h2>
                                <p className="mt-2 text-muted-foreground max-w-md">
                                    Connect your email provider to automatically send payslips and documents to your team.
                                </p>

                                {/* Aligned container for button and guides */}
                                <div className="mt-8 w-full max-w-md px-4">
                                    <Button
                                        size="lg"
                                        className="w-full glow-primary"
                                        onClick={() => setIsCreating(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Your First Configuration
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Quick Setup Guides - Integrated */}
                                <div className="mt-8 w-full max-w-md px-4">
                                    <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p className="max-w-xs">Most email providers require an "App Password" instead of your regular password for security.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        Quick Setup Guides
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <a
                                            href="https://myaccount.google.com/apppasswords"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-lg border bg-card/50 backdrop-blur-sm p-3 hover:bg-card hover:border-primary/30 transition-all group"
                                        >
                                            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2">
                                                <ProviderIcon provider="Gmail" size="sm" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-sm font-medium">Gmail Setup</p>
                                                <p className="text-xs text-muted-foreground">Get app password</p>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </a>
                                        <a
                                            href="https://account.microsoft.com/security"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-lg border bg-card/50 backdrop-blur-sm p-3 hover:bg-card hover:border-primary/30 transition-all group"
                                        >
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-2">
                                                <ProviderIcon provider="Outlook" size="sm" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-sm font-medium">Outlook Setup</p>
                                                <p className="text-xs text-muted-foreground">Create app password</p>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Collapsible Setup Guide for when configs exist */}
                            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between px-1 py-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <HelpCircle className="h-3.5 w-3.5" />
                                            Setup Guides
                                        </span>
                                        <ChevronDown className={cn("h-4 w-4 transition-transform", helpOpen && "rotate-180")} />
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <a
                                            href="https://myaccount.google.com/apppasswords"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-all group"
                                        >
                                            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2">
                                                <ProviderIcon provider="Gmail" size="sm" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Gmail App Password</p>
                                                <p className="text-xs text-muted-foreground">Enable 2FA, then generate an app password</p>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </a>
                                        <a
                                            href="https://account.microsoft.com/security"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-all group"
                                        >
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-2">
                                                <ProviderIcon provider="Outlook" size="sm" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Outlook App Password</p>
                                                <p className="text-xs text-muted-foreground">Enable 2FA in Microsoft account security</p>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </a>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Simplified Configuration Cards */}
                            <div className="space-y-3">
                                {configs.map((config) => (
                                    <Card
                                        key={config.id}
                                        className={cn(
                                            "transition-all hover:shadow-md",
                                            config.isDefault && "border-primary/40 bg-primary/[0.02] shadow-sm"
                                        )}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                {/* Provider Icon */}
                                                <div className={cn(
                                                    "rounded-lg p-2.5 shrink-0",
                                                    config.provider.name === "Gmail" && "bg-red-50 dark:bg-red-950/30",
                                                    config.provider.name === "Outlook" && "bg-blue-50 dark:bg-blue-950/30",
                                                    config.provider.name !== "Gmail" && config.provider.name !== "Outlook" && "bg-muted"
                                                )}>
                                                    <ProviderIcon provider={config.provider.name} />
                                                </div>

                                                {/* Config Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold truncate">{config.name}</h3>
                                                        {config.isDefault && (
                                                            <Badge className="gap-1 bg-primary/10 text-primary border-0 text-xs">
                                                                <Star className="h-2.5 w-2.5 fill-primary" />
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                                                        {config.senderEmail}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hidden sm:flex"
                                                        onClick={() => {
                                                            setTestConfig(config);
                                                            setShowTestDialog(true);
                                                        }}
                                                    >
                                                        <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
                                                        Test
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                className="sm:hidden"
                                                                onClick={() => {
                                                                    setTestConfig(config);
                                                                    setShowTestDialog(true);
                                                                }}
                                                            >
                                                                <TestTube2 className="mr-2 h-4 w-4" />
                                                                Test Connection
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setEditingConfig(config)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            {!config.isDefault && (
                                                                <DropdownMenuItem onClick={() => handleSetDefault(config.id)}>
                                                                    <Star className="mr-2 h-4 w-4" />
                                                                    Set as Default
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
                        </>
                    )}
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
