"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface InviteData {
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  };
  expiresAt: string;
  hasAccount: boolean;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isUsed, setIsUsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchInvite = async () => {
      const supabase = createClient();

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);

      // Fetch invite details
      try {
        const response = await fetch(`/api/invites/accept/${token}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.expired) {
            setIsExpired(true);
          } else if (data.used) {
            setIsUsed(true);
          }
          setError(data.error);
        } else {
          setInvite(data.data);
        }
      } catch {
        setError("Failed to load invite");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/invites/accept/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to accept invite");
        return;
      }

      toast.success(`Welcome to ${data.organization.name}!`);
      router.push("/templates");
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store the invite URL to redirect back after sign in
    sessionStorage.setItem("inviteRedirect", window.location.pathname);
    router.push("/login");
  };

  const handleSignUp = () => {
    // Store the invite URL to redirect back after sign up
    sessionStorage.setItem("inviteRedirect", window.location.pathname);
    router.push(`/signup?email=${encodeURIComponent(invite?.email || "")}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error states
  if (isExpired || isUsed || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>
              {isExpired
                ? "Invite Expired"
                : isUsed
                ? "Invite Already Used"
                : "Invalid Invite"}
            </CardTitle>
            <CardDescription>
              {isExpired
                ? "This invite link has expired. Please ask for a new invitation."
                : isUsed
                ? "This invite has already been accepted."
                : error || "This invite link is invalid."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Email mismatch
  if (
    isAuthenticated &&
    userEmail &&
    invite &&
    userEmail.toLowerCase() !== invite.email.toLowerCase()
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Mail className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle>Different Email Address</CardTitle>
            <CardDescription>
              This invite was sent to <strong>{invite.email}</strong>, but you're
              signed in as <strong>{userEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Please sign out and sign in with the correct email address to accept
              this invite.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              Sign Out
            </Button>
            <Link href="/templates" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main invite view
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invite?.organization.name}</CardTitle>
          <CardDescription>
            {invite?.invitedBy.name || invite?.invitedBy.email} has invited you to
            join their organization as a{" "}
            <strong className="text-foreground">{invite?.role}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-medium">{invite?.organization.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Role</span>
              <span className="font-medium">{invite?.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invited Email</span>
              <span className="font-medium">{invite?.email}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={handleAcceptInvite}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Invite
                </>
              )}
            </Button>
          ) : invite?.hasAccount ? (
            <>
              <p className="text-sm text-center text-muted-foreground mb-2">
                You already have an account. Sign in to accept this invite.
              </p>
              <Button className="w-full" onClick={handleSignIn}>
                Sign In to Accept
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground mb-2">
                Create an account to join {invite?.organization.name}.
              </p>
              <Button className="w-full" onClick={handleSignUp}>
                Create Account
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={handleSignIn}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
