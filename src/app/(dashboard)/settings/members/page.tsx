import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { MembersTable } from "@/components/members/members-table";
import { PendingInvitesSection } from "@/components/members/pending-invites-section";
import { InviteButton } from "@/components/members/invite-button";
import { Users } from "lucide-react";

export const metadata: Metadata = {
    title: "Team Members",
    description: "Manage your team members and roles",
};

export default async function MembersPage() {
    const { context, error } = await getCurrentUser();

    if (error || !context) {
        redirect("/login");
    }

    const { user, currentMembership } = context;

    // Check permissions
    if (!hasPermission(currentMembership.role, "members:read")) {
        redirect("/dashboard");
    }

    const canManageInvites = hasPermission(currentMembership.role, "members:invite");

    return (
        <div className="flex h-full flex-col">
            {/* Unified Header - Desktop */}
            <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-base">Team Members</h1>
                        <p className="text-xs text-muted-foreground">Manage who has access to {currentMembership.organization.name}</p>
                    </div>
                </div>
                {canManageInvites && (
                    <InviteButton organizationName={currentMembership.organization.name} />
                )}
            </div>

            {/* Mobile header */}
            <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Team Members</span>
                </div>
                {canManageInvites && (
                    <InviteButton organizationName={currentMembership.organization.name} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/30">
                <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
                    <MembersTable
                        currentUserId={user.id}
                        currentRole={currentMembership.role}
                        organizationName={currentMembership.organization.name}
                    />

                    <PendingInvitesSection canManageInvites={canManageInvites} />
                </div>
            </div>
        </div>
    );
}
