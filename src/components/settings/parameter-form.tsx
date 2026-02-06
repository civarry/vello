"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { OrganizationParameter } from "@/types/template";
import { labelToKey } from "@/lib/utils";

const SUGGESTED_CATEGORIES = [
    "earnings",
    "deductions",
    "company",
    "benefits",
    "allowances",
    "taxes",
];

interface ParameterFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: {
        key: string;
        label: string;
        category: string;
        dataType: "text" | "number" | "date";
        isRequired: boolean;
    }) => Promise<void>;
    editParameter?: OrganizationParameter | null;
    existingCategories?: string[];
}



export function ParameterForm({
    open,
    onOpenChange,
    onSubmit,
    editParameter,
    existingCategories = [],
}: ParameterFormProps) {
    const [label, setLabel] = useState("");
    const [key, setKey] = useState("");
    const [category, setCategory] = useState("");
    const [customCategory, setCustomCategory] = useState("");
    const [dataType, setDataType] = useState<"text" | "number" | "date">("text");
    const [isRequired, setIsRequired] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [keyEdited, setKeyEdited] = useState(false);

    const isEditing = !!editParameter;

    // All unique categories (suggested + existing from org)
    const allCategories = [
        ...new Set([...SUGGESTED_CATEGORIES, ...existingCategories]),
    ].sort();

    useEffect(() => {
        if (open) {
            if (editParameter) {
                setLabel(editParameter.label);
                setKey(editParameter.key);
                setKeyEdited(true);
                setDataType(editParameter.dataType);
                setIsRequired(editParameter.isRequired);
                // Check if category is in known list
                if (allCategories.includes(editParameter.category)) {
                    setCategory(editParameter.category);
                    setCustomCategory("");
                } else {
                    setCategory("__custom__");
                    setCustomCategory(editParameter.category);
                }
            } else {
                setLabel("");
                setKey("");
                setCategory("");
                setCustomCategory("");
                setDataType("text");
                setIsRequired(false);
                setKeyEdited(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editParameter]);

    // Auto-generate key from label
    useEffect(() => {
        if (!keyEdited && label) {
            const resolvedCategory =
                category === "__custom__" ? customCategory : category;
            const baseKey = labelToKey(label);
            setKey(
                resolvedCategory ? `${resolvedCategory}.${baseKey}` : baseKey
            );
        }
    }, [label, category, customCategory, keyEdited]);

    const resolvedCategory =
        category === "__custom__" ? customCategory.trim() : category;

    const isValid =
        label.trim() &&
        key.trim() &&
        /^[a-zA-Z][a-zA-Z0-9.]*$/.test(key) &&
        resolvedCategory;

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsSubmitting(true);
        try {
            await onSubmit({
                key,
                label: label.trim(),
                category: resolvedCategory,
                dataType,
                isRequired,
            });
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Parameter" : "Add Parameter"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Label */}
                    <div className="space-y-2">
                        <Label htmlFor="param-label">Label</Label>
                        <Input
                            id="param-label"
                            placeholder="e.g., Basic Salary"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                            value={category}
                            onValueChange={(v) => {
                                setCategory(v);
                                if (v !== "__custom__") setCustomCategory("");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </SelectItem>
                                ))}
                                <SelectItem value="__custom__">
                                    Custom...
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {category === "__custom__" && (
                            <Input
                                placeholder="Enter custom category"
                                value={customCategory}
                                onChange={(e) =>
                                    setCustomCategory(
                                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")
                                    )
                                }
                                className="mt-2"
                            />
                        )}
                    </div>

                    {/* Key (auto-generated, editable) */}
                    <div className="space-y-2">
                        <Label htmlFor="param-key">
                            Variable Key
                            <span className="text-xs text-muted-foreground ml-2">
                                (used as {"{{key}}"} in templates)
                            </span>
                        </Label>
                        <Input
                            id="param-key"
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value);
                                setKeyEdited(true);
                            }}
                            className="font-mono text-sm"
                            placeholder="e.g., earnings.basicSalary"
                        />
                        {key && !/^[a-zA-Z][a-zA-Z0-9.]*$/.test(key) && (
                            <p className="text-xs text-destructive">
                                Must start with a letter, only letters, numbers, and dots allowed
                            </p>
                        )}
                    </div>

                    {/* Data Type */}
                    <div className="space-y-2">
                        <Label>Data Type</Label>
                        <Select
                            value={dataType}
                            onValueChange={(v) =>
                                setDataType(v as "text" | "number" | "date")
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Required toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="param-required">Required</Label>
                            <p className="text-xs text-muted-foreground">
                                Warn when this field is empty during generation
                            </p>
                        </div>
                        <Switch
                            id="param-required"
                            checked={isRequired}
                            onCheckedChange={setIsRequired}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                    >
                        {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEditing ? "Save Changes" : "Add Parameter"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
