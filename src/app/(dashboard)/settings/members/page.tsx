import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { MembersTable } from "@/components/members/members-table";
import { PendingInvitesSection } from "@/components/members/pending-invites-section";
import { InviteButton } from "@/components/members/invite-button";

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
        <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Team Members</h2>
                    <p className="text-muted-foreground">
                        Manage who has access to {currentMembership.organization.name}
                    </p>
                </div>

                {canManageInvites && (
                    <InviteButton organizationName={currentMembership.organization.name} />
                )}
            </div>

            <div className="space-y-4">
                <MembersTable
                    currentUserId={user.id}
                    currentRole={currentMembership.role}
                    organizationName={currentMembership.organization.name}
                />

                <PendingInvitesSection canManageInvites={canManageInvites} />
            </div>
        </div>
    );
}
