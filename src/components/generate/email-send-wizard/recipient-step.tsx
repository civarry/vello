"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Info, Users } from "lucide-react";
import { RecipientRecord } from "./types";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface RecipientStepProps {
    recipients: RecipientRecord[];
    emailField: string | null;
    nameField: string | null;
    onEmailFieldChange: (field: string) => void;
    onNameFieldChange: (field: string) => void;
    availableFields: string[];

    // New props for manual mode
    isManualMode: boolean;
    onManualModeToggle: (isManual: boolean) => void;
    manualRecipientsInput: string;
    onManualRecipientsChange: (value: string) => void;
    parsedManualRecipients: { email: string; isValid: boolean }[];
}

export function RecipientStep({
    recipients,
    emailField,
    nameField,
    onEmailFieldChange,
    onNameFieldChange,
    availableFields,

    isManualMode,
    onManualModeToggle,
    manualRecipientsInput,
    onManualRecipientsChange,
    parsedManualRecipients,
}: RecipientStepProps) {
    const validCount = recipients.filter(r => r.isValid).length;
    const invalidCount = recipients.filter(r => !r.isValid).length;

    const validManualCount = parsedManualRecipients.filter(r => r.isValid).length;
    const invalidManualCount = parsedManualRecipients.filter(r => !r.isValid).length;

    // Derived counts based on mode
    const displayValidCount = isManualMode ? validManualCount : validCount;

    // If we have records but no valid emails, we might want to suggest manual mode
    const showManualSuggestion = !isManualMode && validCount === 0 && recipients.length > 0;

    return (
        <div className="space-y-6">
            {/* Mode Switcher / Suggestion */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Recipients</h3>
                    {isManualMode && <Badge variant="secondary">Manual Entry</Badge>}
                </div>

                <Button
                    variant={isManualMode ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => onManualModeToggle(!isManualMode)}
                    className="text-muted-foreground"
                >
                    {isManualMode ? "Switch to Auto-Detection" : "Enter Recipients Manually"}
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{isManualMode ? parsedManualRecipients.length : recipients.length}</p>
                    <p className="text-xs text-muted-foreground">Total Recipients</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-600 dark:text-green-400" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{displayValidCount}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Ready to Send</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
                    <XCircle className="h-5 w-5 mx-auto mb-2 text-red-600 dark:text-red-400" />
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{isManualMode ? invalidManualCount : invalidCount}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Invalid / Missing</p>
                </div>
            </div>

            {/* MANUAL MODE UI */}
            {isManualMode ? (
                <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200">
                            <strong>Manual Distribution Mode:</strong> The {recipients.length} document(s) generated will be sent to EACH of the email addresses you enter below.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label>Enter Email Addresses</Label>
                        <Textarea
                            value={manualRecipientsInput}
                            onChange={(e) => onManualRecipientsChange(e.target.value)}
                            placeholder="user1@example.com, user2@example.com..."
                            className="min-h-[150px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Separate multiple emails with commas, spaces, or newlines.</p>
                    </div>

                    {invalidManualCount > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-destructive">Invalid Emails Detected:</p>
                            <div className="flex flex-wrap gap-1">
                                {parsedManualRecipients.filter(r => !r.isValid).map((r, i) => (
                                    <Badge key={i} variant="destructive">{r.email}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* AUTOMATIC MODE UI */
                <>
                    {/* Field Mapping */}
                    {availableFields.length > 0 && (
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Field Mapping</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emailFieldSelect">Email Column</Label>
                                    <select
                                        id="emailFieldSelect"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        value={emailField || ""}
                                        onChange={(e) => onEmailFieldChange(e.target.value)}
                                    >
                                        <option value="">Select column...</option>
                                        {availableFields.map(field => (
                                            <option key={field} value={field}>{field}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nameFieldSelect">Name Column (Optional)</Label>
                                    <select
                                        id="nameFieldSelect"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        value={nameField || ""}
                                        onChange={(e) => onNameFieldChange(e.target.value)}
                                    >
                                        <option value="">Select column...</option>
                                        {availableFields.map(field => (
                                            <option key={field} value={field}>{field}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Suggestion for Manual Mode */}
                    {showManualSuggestion && (
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
                                <span>No valid emails found in your data.</span>
                                <Button size="sm" variant="outline" className="bg-white/50 border-amber-300 hover:bg-white/80" onClick={() => onManualModeToggle(true)}>
                                    Enter Emails Manually
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Recipients Table */}
                    <div className="rounded-lg border overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0 bg-opacity-100 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-left font-medium w-12 border-b">#</th>
                                        <th className="p-3 text-left font-medium border-b">Name</th>
                                        <th className="p-3 text-left font-medium border-b">Email</th>
                                        <th className="p-3 text-center font-medium w-24 border-b">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recipients.map((recipient, idx) => (
                                        <tr
                                            key={idx}
                                            className={recipient.isValid ? "" : "bg-red-50/50 dark:bg-red-950/20"}
                                        >
                                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                                            <td className="p-3">{recipient.name || "-"}</td>
                                            <td className="p-3 font-mono text-xs">
                                                {recipient.email || <span className="text-muted-foreground italic">Missing</span>}
                                            </td>
                                            <td className="p-3 text-center">
                                                {recipient.isValid ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                                        Valid
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                                        Invalid
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
