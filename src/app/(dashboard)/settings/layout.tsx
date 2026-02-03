import { redirect } from "next/navigation";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { context } = await getCurrentUser();

    if (!context) {
        redirect("/login");
    }

    // MEMBERs cannot access settings pages
    if (!hasPermission(context.currentMembership.role, "settings:manage")) {
        redirect("/templates");
    }

    const canViewAuditLogs = hasPermission(context.currentMembership.role, "audit:read");

    return (
        <div className="flex h-full bg-background">
            <div className="flex w-full md:pl-6">
                <SettingsSidebar canViewAuditLogs={canViewAuditLogs} />
                <Separator orientation="vertical" className="h-full hidden lg:block" />
                <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
