"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Copy, Check, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
}

export function InviteDialog({
  open,
  onOpenChange,
  organizationName,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasSmtpConfig, setHasSmtpConfig] = useState<boolean | null>(null);
  const [checkingSmtp, setCheckingSmtp] = useState(false);
  const prevOrgNameRef = useRef<string>(organizationName);

  // Check SMTP configuration when dialog opens
  useEffect(() => {
    if (open && hasSmtpConfig === null) {
      setCheckingSmtp(true);
      fetch("/api/smtp/config?default=true")
        .then((res) => res.json())
        .then((data) => {
          setHasSmtpConfig(!!data.data);
        })
        .catch(() => {
          setHasSmtpConfig(false);
        })
        .finally(() => {
          setCheckingSmtp(false);
        });
    }
  }, [open, hasSmtpConfig]);

  // Reset state when organization changes
  useEffect(() => {
    if (prevOrgNameRef.current !== organizationName) {
      // Organization changed - reset all state and close dialog
      setEmail("");
      setRole("MEMBER");
      setInviteLink(null);
      setEmailSent(false);
      setCopied(false);
      setIsLoading(false);
      setHasSmtpConfig(null);
      onOpenChange(false);
      prevOrgNameRef.current = organizationName;
    }
  }, [organizationName, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create invite");
        return;
      }

      const link = `${window.location.origin}/invite/${data.data.token}`;
      setInviteLink(link);
      setEmailSent(data.data.emailSent || false);

      if (data.data.emailSent) {
        toast.success(`Invitation sent to ${email}`);
      } else {
        toast.success("Invite created - share the link below");
      }
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("MEMBER");
    setInviteLink(null);
    setEmailSent(false);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {organizationName}</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SMTP Warning */}
            {!checkingSmtp && hasSmtpConfig === false && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Email not configured
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Set up email in{" "}
                      <Link
                        href="/settings/email"
                        className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                        onClick={handleClose}
                      >
                        Settings → Email
                      </Link>{" "}
                      to send invite emails automatically. For now, you can copy and share the invite link instead.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "MEMBER" | "ADMIN")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Members can view and create templates. Admins can also invite others.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasSmtpConfig ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                ) : (
                  "Create Invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {emailSent ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Invitation email sent to {email}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    They will receive an email with instructions to join.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Or share this link directly</Label>
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Invite link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with {email}. It expires in 7 days.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
