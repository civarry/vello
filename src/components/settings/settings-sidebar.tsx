"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, Mail, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const items = [
    {
        title: "General",
        href: "/settings/general",
        icon: Settings,
        description: "Organization profile and preferences",
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

function NavItems({ onItemClick }: { onItemClick?: () => void }) {
    const pathname = usePathname();

    return (
        <>
            {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onItemClick}
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
        </>
    );
}

export function SettingsSidebar() {
    return (
        <nav className="hidden lg:flex flex-col space-y-1 w-64 pr-6 shrink-0 h-[calc(100vh-4rem)] overflow-y-auto pt-6">
            <h3 className="font-semibold text-lg px-2 mb-4">Settings</h3>
            <NavItems />
        </nav>
    );
}

export function MobileSettingsNav() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Get current page title
    const currentItem = items.find(item =>
        pathname === item.href || pathname.startsWith(item.href + "/")
    );

    return (
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b bg-background sticky top-0 z-10">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle settings menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>Settings</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col space-y-1 p-4">
                        <NavItems onItemClick={() => setOpen(false)} />
                    </nav>
                </SheetContent>
            </Sheet>
            <span className="font-medium">{currentItem?.title || "Settings"}</span>
        </div>
    );
}
