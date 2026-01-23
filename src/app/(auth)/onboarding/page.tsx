"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Building2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();

    const [orgName, setOrgName] = useState("");
    const [address, setAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingUser, setIsCheckingUser] = useState(true);

    // Check if user is authenticated and doesn't already have an org
    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                // Not authenticated, redirect to login
                router.push("/login");
                return;
            }

            // Check if user already has an organization
            const response = await fetch("/api/auth/check-org");
            const data = await response.json();

            if (data.hasOrg) {
                // User already has org, redirect to dashboard
                router.push("/templates");
                return;
            }

            setIsCheckingUser(false);
        };

        checkUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orgName.trim()) {
            toast.error("Organization name is required");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    orgName: orgName.trim(),
                    address: address.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create organization");
            }

            toast.success("Organization created successfully!");
            router.push("/templates");
            router.refresh();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Something went wrong"
            );
            setIsLoading(false);
        }
    };

    if (isCheckingUser) {
        return (
            <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground mt-2">Loading...</p>
            </div>
        );
    }

    return (
        <>
            <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold">Set up your organization</h1>
                <p className="text-muted-foreground mt-1">
                    Tell us about your company to get started
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="orgName">Organization name *</Label>
                    <Input
                        id="orgName"
                        type="text"
                        placeholder="Acme Corporation"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                        disabled={isLoading}
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">
                        Address{" "}
                        <span className="text-muted-foreground font-normal">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="address"
                        placeholder="123 Business Ave, Suite 100&#10;Manila, Philippines 1234"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isLoading}
                        rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                        This will appear on your payslip templates
                    </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Continue to dashboard
                </Button>
            </form>
        </>
    );
}
