"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/url-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = getSafeRedirectUrl(searchParams.get("redirect"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        // Check for invite redirect
        const inviteRedirect = sessionStorage.getItem("inviteRedirect");
        if (inviteRedirect) {
            sessionStorage.removeItem("inviteRedirect");
            router.push(inviteRedirect);
        } else {
            router.push(redirect);
        }

        toast.success("Welcome back!");
        router.refresh();
    };

    return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-muted-foreground mt-2">
                    Sign in to your Vello account
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        disabled={isLoading}
                        className="h-11"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                            tabIndex={-1}
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="h-11"
                    />
                </div>

                <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                </Button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">New to Vello?</span>
                </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/signup" className="text-primary font-medium hover:text-primary/80 hover:underline transition-colors" tabIndex={-1}>
                    Create an account
                </Link>
            </p>
        </>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading...</p>
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
