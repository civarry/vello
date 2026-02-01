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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useMembers, type Member } from "@/hooks/use-queries";

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
  const { data: members = [], isLoading, refetch } = useMembers();

  // Dialog states
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

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

  const canChangeRole = (member: Member): boolean => {
    if (!hasPermission(currentRole, "members:update-role")) return false;
    if (member.isCurrentUser) return false;
    if (member.role === "OWNER") return false;
    return true;
  };

  const canRemove = (member: Member): boolean => {
    if (member.isCurrentUser) return false;
    return canRemoveMember(currentRole, member.role, false);
  };

  const canLeave = (): boolean => {
    return currentRole !== "OWNER";
  };

  const canTransfer = (): boolean => {
    return currentRole === "OWNER";
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderMemberActions = (member: Member) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.isCurrentUser && canTransfer() && (
          <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
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

        {!member.isCurrentUser && canChangeRole(member) && (
          <DropdownMenuItem onClick={() => setChangeRoleMember(member)}>
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

        {!member.isCurrentUser && !canChangeRole(member) && !canRemove(member) && (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        )}

        {member.isCurrentUser && !canTransfer() && !canLeave() && (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">
                      {member.name || member.email.split("@")[0]}
                    </p>
                    {member.isCurrentUser && (
                      <span className="text-xs text-muted-foreground shrink-0">(you)</span>
                    )}
                    <Badge variant="outline" className={`${getRoleBadgeClass(member.role)} shrink-0`}>
                      {member.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              {renderMemberActions(member)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-md border">
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
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.name || member.email.split("@")[0]}
                        {member.isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getRoleBadgeClass(member.role)}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(member.joinedAt)}
                </TableCell>
                <TableCell>{renderMemberActions(member)}</TableCell>
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
        onRemoved={() => refetch()}
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
        onRoleChanged={() => refetch()}
      />

      <TransferOwnershipDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        members={members}
        currentUserId={currentUserId}
        onTransferred={() => refetch()}
      />
    </div>
  );
}
