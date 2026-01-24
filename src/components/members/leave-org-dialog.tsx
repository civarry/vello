"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

interface LeaveOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
}

export function LeaveOrgDialog({
  open,
  onOpenChange,
  organizationName,
}: LeaveOrgDialogProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async () => {
    setIsLeaving(true);

    try {
      const response = await fetch("/api/members/leave", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to leave organization");
        return;
      }

      toast.success(`You have left ${organizationName}`);

      // Redirect to the appropriate page
      if (data.data.redirectTo) {
        window.location.href = data.data.redirectTo;
      }
    } catch {
      toast.error("Failed to leave organization");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave organization?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to leave{" "}
              <span className="font-medium">{organizationName}</span>?
            </span>
            <span className="block text-amber-600 dark:text-amber-400">
              You will lose access to all templates and data in this organization.
              To rejoin, you will need to be invited again.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Leave Organization
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
