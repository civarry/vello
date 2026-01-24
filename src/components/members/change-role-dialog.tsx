"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string | null;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  } | null;
  onRoleChanged: () => void;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  onRoleChanged,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [isUpdating, setIsUpdating] = useState(false);

  // Update selected role when member changes
  const currentRole = member?.role === "OWNER" ? "ADMIN" : (member?.role || "MEMBER");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && member && member.role !== "OWNER") {
      setSelectedRole(member.role as "ADMIN" | "MEMBER");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    if (selectedRole === member.role) {
      toast.error(`Member already has the ${selectedRole} role`);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to change role");
        return;
      }

      toast.success(`${member.name || member.email}'s role changed to ${selectedRole}`);
      onRoleChanged();
      onOpenChange(false);
    } catch {
      toast.error("Failed to change role");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Update the role for{" "}
            <span className="font-medium">{member.name || member.email}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as "ADMIN" | "MEMBER")}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Admin:</span> Can invite members and manage templates.
              <br />
              <span className="font-medium">Member:</span> Can view and create templates.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating || selectedRole === currentRole}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
