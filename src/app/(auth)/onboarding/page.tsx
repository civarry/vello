"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

function OnboardingForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isCreatingAdditional = searchParams.get("create") === "true";

    const [orgName, setOrgName] = useState("");
    const [address, setAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingUser, setIsCheckingUser] = useState(true);

    // Check if user is authenticated
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

            // If not creating additional org, check if user already has one
            if (!isCreatingAdditional) {
                const response = await fetch("/api/auth/check-org");
                const data = await response.json();

                if (data.hasOrg) {
                    // User already has org, redirect to dashboard
                    router.push("/templates");
                    return;
                }
            }

            setIsCheckingUser(false);
        };

        checkUser();
    }, [router, isCreatingAdditional]);

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
            {isCreatingAdditional && (
                <div className="mb-4">
                    <Link href="/templates">
                        <Button variant="ghost" size="sm" className="gap-2" tabIndex={-1}>
                            <ArrowLeft className="h-4 w-4" />
                            Back to dashboard
                        </Button>
                    </Link>
                </div>
            )}

            <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold">
                    {isCreatingAdditional
                        ? "Create a new organization"
                        : "Set up your organization"}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {isCreatingAdditional
                        ? "Add another organization to your account"
                        : "Tell us about your company to get started"}
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
                    {isCreatingAdditional ? "Create organization" : "Continue to dashboard"}
                </Button>
            </form>
        </>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense
            fallback={
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading...</p>
                </div>
            }
        >
            <OnboardingForm />
        </Suspense>
    );
}
