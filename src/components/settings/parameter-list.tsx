"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    MoreVertical,
    Pencil,
    Trash2,
    Hash,
    Type,
    Calendar,
    Asterisk,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import type { OrganizationParameter } from "@/types/template";

interface ParameterListProps {
    parameters: OrganizationParameter[];
    onEdit: (parameter: OrganizationParameter) => void;
    onDelete: (id: string) => Promise<void>;
}

const DATA_TYPE_CONFIG = {
    text: {
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
        icon: Type,
    },
    number: {
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
        icon: Hash,
    },
    date: {
        color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
        icon: Calendar,
    },
};

export function ParameterList({
    parameters,
    onEdit,
    onDelete,
}: ParameterListProps) {
    const [deleteTarget, setDeleteTarget] = useState<OrganizationParameter | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    // Group parameters by category
    const grouped = useMemo(() => {
        const groups: Record<string, OrganizationParameter[]> = {};
        for (const p of parameters) {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        }
        return groups;
    }, [parameters]);

    const categoryOrder = Object.keys(grouped).sort();

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await onDelete(deleteTarget.id);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    if (categoryOrder.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Type className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No parameters yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Get started by creating your first parameter to use in templates.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="divide-y divide-border">
                {categoryOrder.map((category) => {
                    const isCollapsed = collapsedCategories.has(category);
                    const categoryParams = grouped[category];

                    return (
                        <div key={category}>
                            {/* Category Header - More Compact */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between px-4 sm:px-5 py-2 bg-muted/30 hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    {isCollapsed ? (
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-sm text-foreground">
                                        {category}
                                    </span>
                                    <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                                        {categoryParams.length}
                                    </Badge>
                                </div>
                            </button>

                            {/* Parameters in Category */}
                            {!isCollapsed && (
                                <div className="divide-y divide-border/50">
                                    {categoryParams.map((param) => {
                                        const typeConfig = DATA_TYPE_CONFIG[param.dataType];
                                        const TypeIcon = typeConfig.icon;

                                        return (
                                            <div
                                                key={param.id}
                                                className="group hover:bg-muted/20 transition-colors"
                                            >
                                                {/* Desktop Layout - Compact One-Liner */}
                                                <div className="hidden sm:flex items-center gap-3 px-5 py-2.5">
                                                    {/* Type Icon - Smaller */}
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded ${typeConfig.color} flex items-center justify-center`}>
                                                        <TypeIcon className="h-4 w-4" />
                                                    </div>

                                                    {/* Main Content - All in One Line */}
                                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                                        <span className="font-medium text-sm text-foreground truncate">
                                                            {param.label}
                                                        </span>
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono flex-shrink-0">
                                                            {"{{"}{param.key}{"}}"}
                                                        </code>
                                                        {param.isRequired && (
                                                            <Badge
                                                                variant="outline"
                                                                className="h-5 px-1.5 text-xs border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 flex-shrink-0"
                                                            >
                                                                <Asterisk className="h-2.5 w-2.5 mr-0.5" />
                                                                Required
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Type Badge - Compact */}
                                                    <Badge
                                                        variant="outline"
                                                        className={`h-6 px-2 text-xs capitalize font-normal ${typeConfig.color} flex-shrink-0`}
                                                    >
                                                        {param.dataType}
                                                    </Badge>

                                                    {/* Actions */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                                <span className="sr-only">Actions</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => onEdit(param)}>
                                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => setDeleteTarget(param)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                {/* Mobile Layout - Stacked but Compact */}
                                                <div className="sm:hidden px-4 py-3">
                                                    <div className="flex items-start gap-2.5">
                                                        {/* Type Icon */}
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded ${typeConfig.color} flex items-center justify-center`}>
                                                            <TypeIcon className="h-4 w-4" />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                                <span className="font-medium text-sm text-foreground">
                                                                    {param.label}
                                                                </span>

                                                                {/* Mobile Actions */}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 -mr-2"
                                                                        >
                                                                            <MoreVertical className="h-4 w-4" />
                                                                            <span className="sr-only">Actions</span>
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => onEdit(param)}>
                                                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                                                            Edit
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:text-destructive"
                                                                            onClick={() => setDeleteTarget(param)}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>

                                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono break-all inline-block mb-1.5">
                                                                {"{{"}{param.key}{"}}"}
                                                            </code>

                                                            {/* Mobile Badges */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`h-5 px-1.5 text-xs capitalize font-normal ${typeConfig.color}`}
                                                                >
                                                                    {param.dataType}
                                                                </Badge>
                                                                {param.isRequired && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-5 px-1.5 text-xs border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                                                                    >
                                                                        <Asterisk className="h-2.5 w-2.5 mr-0.5" />
                                                                        Required
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Parameter</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.label}
                            </span>
                            ? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}