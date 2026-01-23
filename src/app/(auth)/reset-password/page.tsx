"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

    // Check if there's a valid session from the reset link
    useEffect(() => {
        const checkSession = async () => {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // The user should have a session from clicking the reset link
            setIsValidSession(!!session);
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        const supabase = createClient();

        const { error } = await supabase.auth.updateUser({
            password,
        });

        setIsLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        setIsSuccess(true);
        toast.success("Password updated successfully!");

        // Redirect to login after a short delay
        setTimeout(() => {
            router.push("/login");
        }, 2000);
    };

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground mt-2">Loading...</p>
            </div>
        );
    }

    // Invalid or expired reset link
    if (!isValidSession) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Invalid reset link</h1>
                <p className="text-muted-foreground mt-2 mb-6">
                    This password reset link is invalid or has expired. Please request a
                    new one.
                </p>
                <Link href="/forgot-password">
                    <Button className="w-full">Request new reset link</Button>
                </Link>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">Password updated!</h1>
                <p className="text-muted-foreground mt-2">
                    Redirecting you to sign in...
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Reset your password</h1>
                <p className="text-muted-foreground mt-1">
                    Enter your new password below
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Must be at least 6 characters
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update password
                </Button>
            </form>
        </>
    );
}
