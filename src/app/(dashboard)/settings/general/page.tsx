"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Save, Check } from "lucide-react";
import { toast } from "sonner";

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    address: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function GeneralSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [name, setName] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const fetchOrganization = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/organization");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch organization");
            }

            setOrganization(data.data);
            setName(data.data.name);
        } catch (error) {
            console.error("Failed to fetch organization:", error);
            toast.error("Failed to load organization settings");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    useEffect(() => {
        if (organization) {
            setHasChanges(name !== organization.name);
        }
    }, [name, organization]);

    const handleSave = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/organization", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update organization");
            }

            setOrganization(data.data);
            setName(data.data.name);
            toast.success("Organization settings saved");

            // Refresh the page to update sidebar
            window.location.reload();
        } catch (error) {
            console.error("Failed to update organization:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
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
                        <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-base">General Settings</h1>
                        <p className="text-xs text-muted-foreground">Manage your organization details</p>
                    </div>
                </div>
                {hasChanges && (
                    <Button onClick={handleSave} disabled={isSaving} className="glow-primary">
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Mobile header */}
            <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">General Settings</span>
                </div>
                {hasChanges && (
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/30">
                <div className="p-4 md:p-6 space-y-4">
                    {/* Organization Name Card */}
                    <Card>
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        Organization Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter organization name"
                                        maxLength={100}
                                        className="max-w-md"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This name appears throughout the app and in emails sent to your team.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Organization ID Card */}
                    <Card>
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Organization ID
                                </Label>
                                <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                        {organization?.slug}
                                    </code>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Unique identifier for your organization. This cannot be changed.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
