"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TemplateType } from "@/types/template";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Info, Mail, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TemplateSettingsDialog({
    open,
    onOpenChange,
}: TemplateSettingsDialogProps) {
    const {
        templateType,
        recipientEmailField,
        recipientNameField,
        setTemplateType,
        setRecipientEmailField,
        setRecipientNameField,
    } = useTemplateBuilderStore();

    const [localType, setLocalType] = useState<TemplateType>(templateType);
    const [localEmailField, setLocalEmailField] = useState(recipientEmailField || "");
    const [localNameField, setLocalNameField] = useState(recipientNameField || "");
    const [validationError, setValidationError] = useState<string | null>(null);

    // Sync with store when opening
    useEffect(() => {
        if (open) {
            setLocalType(templateType);
            setLocalEmailField(recipientEmailField || "");
            setLocalNameField(recipientNameField || "");
            setValidationError(null);
        }
    }, [open, templateType, recipientEmailField, recipientNameField]);

    // Clear validation error when fields change
    useEffect(() => {
        setValidationError(null);
    }, [localType, localEmailField]);

    const handleSave = () => {
        // Validate: PAYROLL templates require email field
        if (localType === "PAYROLL" && !localEmailField.trim()) {
            setValidationError("Email field is required for Payroll templates. This field is used to send documents to individual recipients.");
            return;
        }

        setTemplateType(localType);
        setRecipientEmailField(localEmailField || null);
        setRecipientNameField(localNameField || null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Template Settings</DialogTitle>
                    <DialogDescription>
                        Configure how this template behaves when sending emails.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Validation Error */}
                    {validationError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="templateType">Template Type</Label>
                        <Select
                            value={localType}
                            onValueChange={(val) => setLocalType(val as TemplateType)}
                        >
                            <SelectTrigger id="templateType">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PAYROLL">Payroll Document (Per-Recipient)</SelectItem>
                                <SelectItem value="GENERAL">General Document (Static)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[0.8rem] text-muted-foreground">
                            {localType === "PAYROLL"
                                ? "Each row in Excel generates a unique document sent to a specific recipient. Requires email field mapping."
                                : "Static document sent to manually entered email addresses. Same PDF goes to all recipients."}
                        </p>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">Email Recipients</h4>
                            {localType === "PAYROLL" && (
                                <span className="text-xs text-red-500 font-medium">Required</span>
                            )}
                        </div>

                        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                                {localType === "PAYROLL" ? (
                                    <>
                                        Specify the column name that will contain email addresses in your Excel file.
                                        This column will be automatically included in the Excel template.
                                    </>
                                ) : (
                                    <>
                                        Optional for General documents. You can manually enter recipient emails when sending.
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="emailField">
                                Recipient Email Field
                                {localType === "PAYROLL" && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                                id="emailField"
                                value={localEmailField}
                                onChange={(e) => setLocalEmailField(e.target.value)}
                                placeholder="Email"
                                className={`${validationError && localType === "PAYROLL" && !localEmailField.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                Column name in Excel (e.g., "Email", "employee.email")
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nameField">
                                Recipient Name Field
                                <span className="text-muted-foreground ml-1 text-xs">(Optional)</span>
                            </Label>
                            <Input
                                id="nameField"
                                value={localNameField}
                                onChange={(e) => setLocalNameField(e.target.value)}
                                placeholder="Name"
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                Used to personalize email greeting (e.g., "Name", "employee.firstName")
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
