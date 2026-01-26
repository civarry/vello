"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, Mail, Settings } from "lucide-react";

const items = [
    {
        title: "General",
        href: "/settings",
        icon: Settings,
        description: "Organization profile and preferences",
        // Temporarily matching /settings/email since /settings redirects there
        // or just /settings if we implement a general page later.
        // For now, let's keep it simple.
    },
    {
        title: "Members",
        href: "/settings/members",
        icon: Users,
        description: "Manage team members and permissions",
    },
    {
        title: "Email",
        href: "/settings/email",
        icon: Mail,
        description: "Configure SMTP and email preferences",
    },
];

export function SettingsSidebar() {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col space-y-1 w-64 pr-6 shrink-0 h-[calc(100vh-4rem)] overflow-y-auto pt-6">
            <h3 className="font-semibold text-lg px-2 mb-4">Settings</h3>
            {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/settings" && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors",
                            isActive ? "bg-muted text-primary" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
