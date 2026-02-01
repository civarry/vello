"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Loader2, X, Copy, Check } from "lucide-react";
import { useInvites, useCancelInvite, type Invite } from "@/hooks/use-queries";

interface PendingInvitesSectionProps {
  canManageInvites: boolean;
}

export function PendingInvitesSection({ canManageInvites }: PendingInvitesSectionProps) {
  const { data: invites = [], isLoading } = useInvites();
  const cancelInvite = useCancelInvite();

  const [cancelingInvite, setCancelingInvite] = useState<Invite | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCancelInvite = async () => {
    if (!cancelingInvite) return;

    try {
      await cancelInvite.mutateAsync(cancelingInvite.id);
      toast.success(`Invite for ${cancelingInvite.email} has been canceled`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel invite");
    } finally {
      setCancelingInvite(null);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const formatExpiresIn = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return "Expired";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      default:
        return "secondary";
    }
  };

  // Don't show loading spinner - MembersTable already shows one
  // Return null while loading or if no invites
  if (isLoading || invites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Pending Invites ({invites.length})
        </h3>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{invite.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getRoleBadgeVariant(invite.role)} className="text-xs">
                    {invite.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Expires in {formatExpiresIn(invite.expiresAt)}
                  </span>
                </div>
              </div>
              {canManageInvites && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyLink(invite.token)}
                  >
                    {copiedToken === invite.token ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setCancelingInvite(invite)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Expires</TableHead>
              {canManageInvites && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(invite.role)}>
                    {invite.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatExpiresIn(invite.expiresAt)}
                </TableCell>
                {canManageInvites && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(invite.token)}
                        title="Copy invite link"
                      >
                        {copiedToken === invite.token ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setCancelingInvite(invite)}
                        title="Cancel invite"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!cancelingInvite} onOpenChange={() => setCancelingInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invite for{" "}
              <span className="font-medium">{cancelingInvite?.email}</span>?
              They will not be able to join using the existing invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInvite.isPending}>Keep Invite</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              disabled={cancelInvite.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
