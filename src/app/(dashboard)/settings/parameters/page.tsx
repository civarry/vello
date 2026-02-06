"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    useParameters,
    useCreateParameter,
    useUpdateParameter,
    useDeleteParameter,
} from "@/hooks/use-queries";
import { ParameterForm } from "@/components/settings/parameter-form";
import { ParameterList } from "@/components/settings/parameter-list";
import type { OrganizationParameter } from "@/types/template";

export default function ParametersSettingsPage() {
    const { data: parameters, isLoading } = useParameters();
    const createParameter = useCreateParameter();
    const updateParameter = useUpdateParameter();
    const deleteParameter = useDeleteParameter();

    const [formOpen, setFormOpen] = useState(false);
    const [editParam, setEditParam] = useState<OrganizationParameter | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const existingCategories = [
        ...new Set((parameters ?? []).map((p) => p.category)),
    ];

    // Filter parameters based on search
    const filteredParameters = useMemo(() => {
        if (!parameters) return [];
        if (!searchQuery.trim()) return parameters;

        const query = searchQuery.toLowerCase();
        return parameters.filter(
            (param) =>
                param.label.toLowerCase().includes(query) ||
                param.key.toLowerCase().includes(query) ||
                param.category.toLowerCase().includes(query)
        );
    }, [parameters, searchQuery]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!parameters) return { total: 0, required: 0, categories: 0 };
        return {
            total: parameters.length,
            required: parameters.filter((p) => p.isRequired).length,
            categories: new Set(parameters.map((p) => p.category)).size,
        };
    }, [parameters]);

    const handleCreate = async (data: {
        key: string;
        label: string;
        category: string;
        dataType: "text" | "number" | "date";
        isRequired: boolean;
    }) => {
        try {
            await createParameter.mutateAsync(data);
            toast.success("Parameter created successfully");
            setFormOpen(false);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to create parameter"
            );
            throw error;
        }
    };

    const handleUpdate = async (data: {
        key: string;
        label: string;
        category: string;
        dataType: "text" | "number" | "date";
        isRequired: boolean;
    }) => {
        if (!editParam) return;
        try {
            await updateParameter.mutateAsync({ id: editParam.id, ...data });
            toast.success("Parameter updated successfully");
            setFormOpen(false);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to update parameter"
            );
            throw error;
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteParameter.mutateAsync(id);
            toast.success("Parameter deleted successfully");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to delete parameter"
            );
        }
    };

    const handleEdit = (param: OrganizationParameter) => {
        setEditParam(param);
        setFormOpen(true);
    };

    const handleNewParameter = () => {
        setEditParam(null);
        setFormOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading parameters...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
                {/* Header */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Parameters
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Define reusable variables with type validation for your templates.
                            </p>
                        </div>
                        <Button onClick={handleNewParameter} size="default" className="sm:w-auto w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            New Parameter
                        </Button>
                    </div>

                    {/* Statistics Cards - More Compact */}
                    {parameters && parameters.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card>
                                <CardContent className="p-3 sm:p-4">
                                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                                        {stats.total}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Total
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3 sm:p-4">
                                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                                        {stats.categories}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Categories
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3 sm:p-4">
                                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                                        {stats.required}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Required
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Search Bar - More Compact */}
                    {parameters && parameters.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, key, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    )}
                </div>

                {/* Parameter List */}
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <ParameterList
                            parameters={filteredParameters}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </CardContent>
                </Card>

                {/* Search Empty State */}
                {searchQuery && filteredParameters.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                            No parameters match your search for "{searchQuery}"
                        </p>
                        <Button
                            variant="link"
                            onClick={() => setSearchQuery("")}
                            className="mt-2 h-auto p-0 text-sm"
                        >
                            Clear search
                        </Button>
                    </div>
                )}
            </div>

            {/* Form Dialog */}
            <ParameterForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditParam(null);
                }}
                onSubmit={editParam ? handleUpdate : handleCreate}
                editParameter={editParam}
                existingCategories={existingCategories}
            />
        </div>
    );
}