"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentUserId: string;
  onTransferred: () => void;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  onTransferred,
}: TransferOwnershipDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Get eligible members (not the current owner)
  const eligibleMembers = members.filter(
    (m) => m.userId !== currentUserId && m.role !== "OWNER"
  );

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedMemberId("");
    }
  }, [open]);

  const handleTransfer = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a member to transfer ownership to");
      return;
    }

    setIsTransferring(true);

    try {
      const response = await fetch("/api/members/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: selectedMemberId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to transfer ownership");
        return;
      }

      const newOwner = data.data.newOwner;
      toast.success(`Ownership transferred to ${newOwner.name || newOwner.email}`);

      // Use hard navigation to refresh the page with new role data
      window.location.reload();
    } catch {
      toast.error("Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedMember = eligibleMembers.find((m) => m.id === selectedMemberId);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Transfer Ownership
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              You are about to transfer ownership of this organization. This action is immediate
              and cannot be undone.
            </span>
            <span className="block font-medium text-amber-600 dark:text-amber-400">
              You will become an Admin after the transfer.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-owner">New Owner</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              disabled={isTransferring}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.length === 0 ? (
                  <SelectItem value="_" disabled>
                    No eligible members
                  </SelectItem>
                ) : (
                  eligibleMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-2">
                        <span>{member.name || member.email}</span>
                        <span className="text-xs text-muted-foreground">
                          ({member.role})
                        </span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">
                  {selectedMember.name || selectedMember.email}
                </span>{" "}
                will become the new owner and have full control over this organization.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleTransfer}
            disabled={isTransferring || !selectedMemberId}
          >
            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer Ownership
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
