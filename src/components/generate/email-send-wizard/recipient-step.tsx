"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Info, Users } from "lucide-react";
import { RecipientRecord } from "./types";

interface RecipientStepProps {
    recipients: RecipientRecord[];
    emailField: string | null;
    nameField: string | null;
    onEmailFieldChange: (field: string) => void;
    onNameFieldChange: (field: string) => void;
    availableFields: string[];
}

export function RecipientStep({
    recipients,
    emailField,
    nameField,
    onEmailFieldChange,
    onNameFieldChange,
    availableFields,
}: RecipientStepProps) {
    const validCount = recipients.filter(r => r.isValid).length;
    const invalidCount = recipients.filter(r => !r.isValid).length;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{recipients.length}</p>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-600 dark:text-green-400" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{validCount}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Ready to Send</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
                    <XCircle className="h-5 w-5 mx-auto mb-2 text-red-600 dark:text-red-400" />
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{invalidCount}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Missing Email</p>
                </div>
            </div>

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

            {/* Warning for invalid records */}
            {invalidCount > 0 && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                        {invalidCount} record{invalidCount !== 1 ? "s" : ""} will be skipped because {invalidCount !== 1 ? "they don't" : "it doesn't"} have a valid email address.
                        {!emailField && " Try selecting a different email column above."}
                    </AlertDescription>
                </Alert>
            )}

            {/* Recipients Table */}
            <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                            <tr>
                                <th className="p-3 text-left font-medium w-12">#</th>
                                <th className="p-3 text-left font-medium">Name</th>
                                <th className="p-3 text-left font-medium">Email</th>
                                <th className="p-3 text-center font-medium w-24">Status</th>
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
        </div>
    );
}
