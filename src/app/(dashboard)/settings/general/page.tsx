"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { useOrganization, useUpdateOrganization } from "@/hooks/use-queries";

export default function GeneralSettingsPage() {
    const { data: organization, isLoading } = useOrganization();
    const updateOrganization = useUpdateOrganization();

    const [name, setName] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // Sync local state with fetched data
    useEffect(() => {
        if (organization) {
            setName(organization.name);
        }
    }, [organization]);

    // Track changes
    useEffect(() => {
        if (organization) {
            setHasChanges(name !== organization.name);
        }
    }, [name, organization]);

    const handleSave = async () => {
        if (!hasChanges) return;

        try {
            await updateOrganization.mutateAsync({ name });
            toast.success("Organization settings saved");
            // Refresh the page to update sidebar
            window.location.reload();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save settings");
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
                    <Button onClick={handleSave} disabled={updateOrganization.isPending} className="glow-primary">
                        {updateOrganization.isPending ? (
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
                    <Button size="sm" onClick={handleSave} disabled={updateOrganization.isPending}>
                        {updateOrganization.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/30">
                <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
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
                </div>
            </div>
        </div>
    );
}
