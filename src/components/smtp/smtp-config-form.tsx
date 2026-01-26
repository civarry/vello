"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Loader2,
    Mail,
    Check,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    Info,
    Server,
    Lock,
    User,
    FileText,
    ExternalLink,
    Eye,
    EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Provider {
    id: string;
    name: string;
    smtpServer: string;
    smtpPort: number;
    useTLS: boolean;
    description?: string | null;
}

interface SMTPConfigFormProps {
    initialConfig?: {
        id?: string;
        name?: string;
        providerId?: string;
        senderEmail?: string;
        senderName?: string | null;
        smtpUsername?: string;
        emailSubject?: string | null;
        emailBody?: string | null;
        customSmtpServer?: string;
        customSmtpPort?: number;
        provider?: Provider;
    };
    onSuccess?: (config: unknown) => void;
    submitLabel?: string;
}

// Provider icons/logos
const ProviderIcon = ({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-10 w-10",
        lg: "h-12 w-12",
    };

    const iconSize = sizeClasses[size];

    if (name === "Gmail") {
        return (
            <div className={cn(iconSize, "relative flex items-center justify-center")}>
                <svg viewBox="0 0 24 24" className="w-full h-full">
                    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
            </div>
        );
    }

    if (name === "Outlook") {
        return (
            <div className={cn(iconSize, "relative flex items-center justify-center")}>
                <svg viewBox="0 0 24 24" className="w-full h-full">
                    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.203.91c.094.074.204.112.33.112s.235-.038.329-.113l7.238-5.473a.593.593 0 0 1 .265.24zM23.182 5.8a.718.718 0 0 0-.36-.1h-8.187v4.5l1.203.91 7.344-5.31zM9.555 8.523v8.642H.818c-.228 0-.42-.076-.574-.23C.082 16.782 0 16.589 0 16.358V5.8c0-.228.082-.42.244-.575.154-.154.346-.23.574-.23h8.737v3.528z" />
                    <ellipse cx="5.187" cy="12.893" rx="3.273" ry="3.273" fill="#0078D4" />
                </svg>
            </div>
        );
    }

    // Custom/Other
    return (
        <div className={cn(iconSize, "rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center")}>
            <Server className="h-1/2 w-1/2 text-white" />
        </div>
    );
};

const DEFAULT_EMAIL_SUBJECT = "{{documentType}} for {{period}}";
const DEFAULT_EMAIL_BODY = `Hi {{recipientName}},

Please find attached your {{documentType}} for {{period}}.

If you have any questions, please don't hesitate to contact us.

Best regards,
{{organizationName}}`;

export function SMTPConfigForm({
    initialConfig,
    onSuccess,
    submitLabel = "Save Configuration",
}: SMTPConfigFormProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [step, setStep] = useState<"select" | "configure">(
        initialConfig ? "configure" : "select"
    );
    const [showPassword, setShowPassword] = useState(false);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [configName, setConfigName] = useState(initialConfig?.name || "");
    const [selectedProviderId, setSelectedProviderId] = useState(
        initialConfig?.providerId || ""
    );
    const [senderEmail, setSenderEmail] = useState(initialConfig?.senderEmail || "");
    const [senderName, setSenderName] = useState(initialConfig?.senderName || "");
    const [smtpUsername, setSmtpUsername] = useState(initialConfig?.smtpUsername || "");
    const [smtpPassword, setSmtpPassword] = useState("");
    const [emailSubject, setEmailSubject] = useState(
        initialConfig?.emailSubject || DEFAULT_EMAIL_SUBJECT
    );
    const [emailBody, setEmailBody] = useState(
        initialConfig?.emailBody || DEFAULT_EMAIL_BODY
    );
    // Custom SMTP server fields
    const [customSmtpServer, setCustomSmtpServer] = useState(
        initialConfig?.customSmtpServer || ""
    );
    const [customSmtpPort, setCustomSmtpPort] = useState(
        initialConfig?.customSmtpPort?.toString() || "587"
    );

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/smtp/providers");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch providers");
            }

            setProviders(data.data);
        } catch (error) {
            console.error("Failed to fetch providers:", error);
            toast.error("Failed to load email providers. Please ensure the database is seeded.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProviderSelect = (providerId: string) => {
        setSelectedProviderId(providerId);
        setErrors({});
        setStep("configure");
    };

    // Sanitize password by removing spaces (Gmail app passwords are often copied with spaces)
    const sanitizePassword = (password: string): string => {
        return password.replace(/\s/g, "");
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!configName.trim()) {
            newErrors.configName = "Configuration name is required";
        }

        if (!senderEmail) {
            newErrors.senderEmail = "Sender email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
            newErrors.senderEmail = "Please enter a valid email address";
        }

        if (!smtpUsername) {
            newErrors.smtpUsername = "Username is required";
        }

        const selectedProvider = providers.find((p) => p.id === selectedProviderId);

        if (!smtpPassword && !initialConfig) {
            newErrors.smtpPassword = "Password is required";
        } else if (smtpPassword) {
            const cleanPassword = sanitizePassword(smtpPassword);

            // Validate Gmail app password (must be exactly 16 characters)
            if (selectedProvider?.name === "Gmail" && cleanPassword.length !== 16) {
                newErrors.smtpPassword = `Gmail app password must be 16 characters (currently ${cleanPassword.length})`;
            }

            // Validate Outlook app password (typically 16 characters as well)
            if (selectedProvider?.name === "Outlook" && cleanPassword.length !== 16) {
                newErrors.smtpPassword = `Outlook app password must be 16 characters (currently ${cleanPassword.length})`;
            }
        }

        if (selectedProvider?.name === "Custom") {
            if (!customSmtpServer) {
                newErrors.customSmtpServer = "SMTP server is required";
            }
            const port = parseInt(customSmtpPort);
            if (!customSmtpPort || isNaN(port) || port < 1 || port > 65535) {
                newErrors.customSmtpPort = "Enter a valid port (1-65535)";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fix the errors before submitting");
            return;
        }

        setIsSaving(true);

        try {
            const payload: Record<string, unknown> = {
                name: configName,
                providerId: selectedProviderId,
                senderEmail,
                senderName: senderName || undefined,
                smtpUsername,
                emailSubject: emailSubject || undefined,
                emailBody: emailBody || undefined,
            };

            // Only include password if it was changed (sanitize by removing spaces)
            if (smtpPassword) {
                payload.smtpPassword = sanitizePassword(smtpPassword);
            }

            // Include custom SMTP settings if applicable
            const selectedProvider = providers.find((p) => p.id === selectedProviderId);
            if (selectedProvider?.name === "Custom") {
                payload.customSmtpServer = customSmtpServer;
                payload.customSmtpPort = parseInt(customSmtpPort);
            }

            // Use PUT for updates, POST for new configs
            const url = initialConfig?.id
                ? `/api/smtp/config/${initialConfig.id}`
                : "/api/smtp/config";
            const method = initialConfig?.id ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save configuration");
            }

            toast.success("Configuration saved successfully");
            setSmtpPassword(""); // Clear password field
            setErrors({});
            if (onSuccess) {
                onSuccess(data.data);
            }
        } catch (error) {
            console.error("Failed to save config:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const selectedProvider = providers.find((p) => p.id === selectedProviderId);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading email providers...</p>
            </div>
        );
    }

    // Provider Selection Step
    if (step === "select") {
        return (
            <div className="space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Choose Your Email Provider</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Select how you want to send documents via email. You can change this later.
                    </p>
                </div>

                {providers.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Providers Available</h3>
                            <p className="text-muted-foreground text-center max-w-sm mb-4">
                                Email providers haven't been configured yet. Please run the database seed script.
                            </p>
                            <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono">
                                npx ts-node prisma/seed-email-providers.ts
                            </code>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {providers.map((provider) => (
                            <Card
                                key={provider.id}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50",
                                    "group relative overflow-hidden"
                                )}
                                onClick={() => handleProviderSelect(provider.id)}
                            >
                                <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
                                    <div className="mb-4 transition-transform duration-200 group-hover:scale-110">
                                        <ProviderIcon name={provider.name} size="lg" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">{provider.name}</h3>
                                    {provider.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                            {provider.description}
                                        </p>
                                    )}
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {provider.smtpServer}:{provider.smtpPort}
                                    </Badge>
                                </CardContent>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Configuration Step
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selected Provider Header */}
            {selectedProvider && (
                <Card className="bg-muted/30">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-4">
                            <ProviderIcon name={selectedProvider.name} size="md" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{selectedProvider.name}</h3>
                                    <Badge variant="outline" className="text-xs">
                                        {selectedProvider.useTLS ? "TLS" : "Plain"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono">
                                    {selectedProvider.name === "Custom" ? "Custom SMTP Server" : (
                                        `${selectedProvider.smtpServer}:${selectedProvider.smtpPort}`
                                    )}
                                </p>
                            </div>
                            {!initialConfig && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setStep("select");
                                        setErrors({});
                                    }}
                                >
                                    Change
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Configuration Name */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">Configuration Name</CardTitle>
                    <CardDescription>
                        Give this email configuration a name to identify it
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="configName">Name *</Label>
                        <Input
                            id="configName"
                            type="text"
                            placeholder={`My ${selectedProvider?.name || 'Email'} Account`}
                            value={configName}
                            onChange={(e) => setConfigName(e.target.value)}
                            className={cn(errors.configName && "border-destructive")}
                        />
                        {errors.configName && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.configName}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            e.g., "HR Gmail", "Finance Outlook", "Marketing Email"
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Custom SMTP Server Settings */}
            {selectedProvider?.name === "Custom" && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            Server Settings
                        </CardTitle>
                        <CardDescription>
                            Configure your custom SMTP server details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="customSmtpServer">SMTP Server *</Label>
                                <Input
                                    id="customSmtpServer"
                                    type="text"
                                    placeholder="smtp.example.com"
                                    value={customSmtpServer}
                                    onChange={(e) => setCustomSmtpServer(e.target.value)}
                                    className={cn(errors.customSmtpServer && "border-destructive")}
                                />
                                {errors.customSmtpServer && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.customSmtpServer}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customSmtpPort">Port *</Label>
                                <Input
                                    id="customSmtpPort"
                                    type="number"
                                    placeholder="587"
                                    value={customSmtpPort}
                                    onChange={(e) => setCustomSmtpPort(e.target.value)}
                                    className={cn(errors.customSmtpPort && "border-destructive")}
                                />
                                {errors.customSmtpPort && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.customSmtpPort}
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Common ports: 587 (TLS), 465 (SSL), 25 (Plain)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Sender Configuration */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Sender Information
                    </CardTitle>
                    <CardDescription>
                        This will appear in the "From" field of sent emails
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="senderEmail">Sender Email *</Label>
                            <Input
                                id="senderEmail"
                                type="email"
                                placeholder={
                                    selectedProvider?.name === "Gmail"
                                        ? "your.email@gmail.com"
                                        : selectedProvider?.name === "Outlook"
                                            ? "your.email@outlook.com"
                                            : "noreply@company.com"
                                }
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                className={cn(errors.senderEmail && "border-destructive")}
                            />
                            {errors.senderEmail && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.senderEmail}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="senderName">Display Name</Label>
                            <Input
                                id="senderName"
                                type="text"
                                placeholder="Company Name"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional: Shows as "Company Name &lt;email&gt;"
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Authentication */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Authentication
                    </CardTitle>
                    <CardDescription>
                        Your SMTP login credentials
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpUsername" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {selectedProvider?.name === "Gmail" || selectedProvider?.name === "Outlook"
                                    ? "Email Address *"
                                    : "Username *"}
                            </Label>
                            <Input
                                id="smtpUsername"
                                type="text"
                                placeholder={
                                    selectedProvider?.name === "Gmail"
                                        ? "your.email@gmail.com"
                                        : selectedProvider?.name === "Outlook"
                                            ? "your.email@outlook.com"
                                            : "username"
                                }
                                value={smtpUsername}
                                onChange={(e) => setSmtpUsername(e.target.value)}
                                className={cn(errors.smtpUsername && "border-destructive")}
                            />
                            {errors.smtpUsername && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.smtpUsername}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPassword">
                                {initialConfig ? "App Password (leave empty to keep current)" : "App Password *"}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="smtpPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={initialConfig ? "Enter new password to change" : "16-character app password"}
                                    value={smtpPassword}
                                    onChange={(e) => setSmtpPassword(e.target.value)}
                                    className={cn("pr-10", errors.smtpPassword && "border-destructive")}
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
                            {errors.smtpPassword ? (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.smtpPassword}
                                </p>
                            ) : (selectedProvider?.name === "Gmail" || selectedProvider?.name === "Outlook") && smtpPassword ? (
                                <p className="text-xs text-muted-foreground">
                                    {sanitizePassword(smtpPassword).length}/16 characters
                                    {smtpPassword.includes(" ") && " (spaces will be removed)"}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {/* Provider-specific help */}
                    {selectedProvider?.name === "Gmail" && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Gmail App Password Required</p>
                                    <ol className="text-xs text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                                        <li>Enable 2-Factor Authentication on your Google Account</li>
                                        <li>Go to Security → App passwords</li>
                                        <li>Generate a new app password for "Mail"</li>
                                        <li>Copy the 16-character password (no spaces)</li>
                                    </ol>
                                    <a
                                        href="https://myaccount.google.com/apppasswords"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        Open Google App Passwords
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedProvider?.name === "Outlook" && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Outlook App Password Required</p>
                                    <ol className="text-xs text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                                        <li>Go to your Microsoft account security settings</li>
                                        <li>Enable 2-Step Verification</li>
                                        <li>Create an app password under "App passwords"</li>
                                        <li>Use the generated password above</li>
                                    </ol>
                                    <a
                                        href="https://account.microsoft.com/security"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        Open Microsoft Security
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Template - Collapsible */}
            <Collapsible open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                <Card>
                    <CollapsibleTrigger asChild>
                        <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <CardTitle className="text-base">Email Template</CardTitle>
                                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                                </div>
                                {isTemplateOpen ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <CardDescription className="text-left">
                                Customize the email subject and body sent with documents
                            </CardDescription>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="space-y-4 pt-0">
                            <div className="space-y-2">
                                <Label htmlFor="emailSubject">Subject Line</Label>
                                <Input
                                    id="emailSubject"
                                    type="text"
                                    placeholder="{{documentType}} for {{period}}"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emailBody">Email Body</Label>
                                <Textarea
                                    id="emailBody"
                                    rows={8}
                                    placeholder="Enter your email body template..."
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                                <p className="text-xs font-medium mb-2">Available Variables:</p>
                                <div className="flex flex-wrap gap-2">
                                    {["{{recipientName}}", "{{documentType}}", "{{period}}", "{{organizationName}}"].map((variable) => (
                                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                                            {variable}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Submit Button */}
            <Button type="submit" disabled={isSaving} className="w-full" size="lg">
                {isSaving ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Check className="mr-2 h-4 w-4" />
                        {submitLabel}
                    </>
                )}
            </Button>
        </form>
    );
}
