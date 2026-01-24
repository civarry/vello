"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  MoreVertical,
  UserMinus,
  LogOut,
  Shield,
  Crown,
} from "lucide-react";
import { canRemoveMember, hasPermission } from "@/lib/permissions";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { LeaveOrgDialog } from "./leave-org-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";
import { MemberListItem } from "@/lib/validations/member";

interface MembersTableProps {
  currentUserId: string;
  currentRole: "OWNER" | "ADMIN" | "MEMBER";
  organizationName: string;
}

export function MembersTable({
  currentUserId,
  currentRole,
  organizationName,
}: MembersTableProps) {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [removeMember, setRemoveMember] = useState<MemberListItem | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<MemberListItem | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/members");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch members");
      }

      setMembers(data.data);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "ADMIN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const canChangeRole = (member: MemberListItem): boolean => {
    // Only OWNER can change roles
    if (!hasPermission(currentRole, "members:update-role")) return false;
    // Cannot change own role
    if (member.isCurrentUser) return false;
    // Cannot change OWNER role
    if (member.role === "OWNER") return false;
    return true;
  };

  const canRemove = (member: MemberListItem): boolean => {
    // Cannot remove self via this action (use leave instead)
    if (member.isCurrentUser) return false;
    return canRemoveMember(currentRole, member.role, false);
  };

  const canLeave = (): boolean => {
    // OWNER cannot leave (must transfer first)
    return currentRole !== "OWNER";
  };

  const canTransfer = (): boolean => {
    // Only OWNER can transfer
    return currentRole === "OWNER";
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {(member.name || member.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.name || member.email.split("@")[0]}
                        {member.isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getRoleBadgeClass(member.role)}
                  >
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(member.joinedAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Self actions */}
                      {member.isCurrentUser && canTransfer() && (
                        <DropdownMenuItem
                          onClick={() => setShowTransferDialog(true)}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Transfer Ownership
                        </DropdownMenuItem>
                      )}

                      {member.isCurrentUser && canLeave() && (
                        <DropdownMenuItem
                          onClick={() => setShowLeaveDialog(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Leave Organization
                        </DropdownMenuItem>
                      )}

                      {/* Actions on other members */}
                      {!member.isCurrentUser && canChangeRole(member) && (
                        <DropdownMenuItem
                          onClick={() => setChangeRoleMember(member)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                      )}

                      {!member.isCurrentUser && canChangeRole(member) && canRemove(member) && (
                        <DropdownMenuSeparator />
                      )}

                      {!member.isCurrentUser && canRemove(member) && (
                        <DropdownMenuItem
                          onClick={() => setRemoveMember(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      )}

                      {/* No actions available */}
                      {!member.isCurrentUser &&
                        !canChangeRole(member) &&
                        !canRemove(member) && (
                          <DropdownMenuItem disabled>
                            No actions available
                          </DropdownMenuItem>
                        )}

                      {member.isCurrentUser &&
                        !canTransfer() &&
                        !canLeave() && (
                          <DropdownMenuItem disabled>
                            No actions available
                          </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <RemoveMemberDialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
        member={removeMember}
        onRemoved={fetchMembers}
      />

      <LeaveOrgDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        organizationName={organizationName}
      />

      <ChangeRoleDialog
        open={!!changeRoleMember}
        onOpenChange={(open) => !open && setChangeRoleMember(null)}
        member={changeRoleMember}
        onRoleChanged={fetchMembers}
      />

      <TransferOwnershipDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        members={members}
        currentUserId={currentUserId}
        onTransferred={fetchMembers}
      />
    </div>
  );
}
