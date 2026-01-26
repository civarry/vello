import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Separator } from "@/components/ui/separator";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background">
            <div className="flex w-full pl-6">
                <SettingsSidebar />
                <Separator orientation="vertical" className="h-full" />
                <div className="flex-1 min-w-0 h-full overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
