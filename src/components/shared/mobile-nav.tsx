"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    LayoutTemplate,
    Menu,
    LogOut,
    Settings,
    ChevronDown,
    ChevronRight,
    Check,
    Plus,
    UserPlus,
    Users,
    Mail,
    Building2,
    ClipboardList,
    SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { InviteDialog } from "./invite-dialog";

interface OrganizationInfo {
    id: string;
    name: string;
    slug: string;
    role: string;
}

interface MobileNavProps {
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    currentOrganization: {
        id: string;
        name: string;
    };
    currentRole: string;
    allOrganizations: OrganizationInfo[];
}

const mainNavigation = [
    { name: "Templates", href: "/templates", icon: LayoutTemplate },
];

const settingsNavigation = [
    { name: "General", href: "/settings/general", icon: Building2 },
    { name: "Parameters", href: "/settings/parameters", icon: SlidersHorizontal },
    { name: "Members", href: "/settings/members", icon: Users },
    { name: "Email", href: "/settings/email", icon: Mail },
    { name: "Audit Log", href: "/settings/audit-log", icon: ClipboardList, requiredRole: ["OWNER", "ADMIN"] as string[] },
];

export function MobileNav({
    user,
    currentOrganization,
    currentRole,
    allOrganizations,
}: MobileNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Auto-expand settings when on settings page
    const isOnSettingsPage = pathname.startsWith("/settings");
    const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);

    // Handle hydration
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Get display name
    const displayName = user.name || user.email.split("@")[0];
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
    };

    const handleSwitchOrganization = async (orgId: string) => {
        if (orgId === currentOrganization.id) return;

        setIsSwitching(true);
        setOpen(false);

        try {
            const response = await fetch("/api/organizations/switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: orgId }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to switch organization");
                setIsSwitching(false);
                return;
            }

            toast.success(`Switched to ${data.organization.name}`);
            window.location.href = pathname;
        } catch (error) {
            toast.error("Failed to switch organization");
            setIsSwitching(false);
        }
    };

    const handleCreateOrganization = () => {
        setOpen(false);
        router.push("/onboarding?create=true");
    };

    // Get role badge color
    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case "OWNER":
                return "bg-[oklch(0.88_0.12_85_/_0.15)] text-[oklch(0.45_0.12_75)] dark:bg-[oklch(0.75_0.12_85_/_0.20)] dark:text-[oklch(0.85_0.12_85)]";
            case "ADMIN":
                return "bg-[oklch(0.55_0.12_175_/_0.12)] text-[oklch(0.40_0.10_175)] dark:bg-[oklch(0.55_0.12_175_/_0.25)] dark:text-[oklch(0.80_0.10_175)]";
            default:
                return "bg-muted text-muted-foreground";
        }
    };

    // Don't render interactive components until hydrated to prevent ID mismatch
    if (!isHydrated) {
        return (
            <div className="md:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b bg-background">
                <Link href="/templates" className="flex items-center gap-2">
                    <Image
                        src="/icon.png"
                        alt="Vello"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <span className="font-semibold text-lg">Vello</span>
                </Link>
                <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="md:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b bg-background">
                {/* Logo */}
                <Link href="/templates" className="flex items-center gap-2">
                    <Image
                        src="/icon.png"
                        alt="Vello"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <span className="font-semibold text-lg">Vello</span>
                </Link>

                {/* Menu Button */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.50_0.14_200)] text-primary-foreground text-xs font-semibold">
                                    {initials}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium">{displayName}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                                </div>
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex flex-col h-[calc(100%-4rem)]">
                            {/* Organization Switcher */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-medium text-muted-foreground mb-2">ORGANIZATION</p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            disabled={isSwitching}
                                            className="w-full justify-between h-auto py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary text-sm font-semibold">
                                                    {currentOrganization.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium">{currentOrganization.name}</p>
                                                    <p className="text-xs text-muted-foreground">{currentRole}</p>
                                                </div>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-72">
                                        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {allOrganizations.map((org) => (
                                            <DropdownMenuItem
                                                key={org.id}
                                                onClick={() => handleSwitchOrganization(org.id)}
                                                className="flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-medium shrink-0">
                                                        {org.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate">{org.name}</span>
                                                    <span
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                                                            getRoleBadgeClass(org.role)
                                                        )}
                                                    >
                                                        {org.role}
                                                    </span>
                                                </div>
                                                {org.id === currentOrganization.id && (
                                                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        {(currentRole === "OWNER" || currentRole === "ADMIN") && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setOpen(false);
                                                    setShowInviteDialog(true);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                Invite Member
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            onClick={handleCreateOrganization}
                                            className="cursor-pointer"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Organization
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {/* Main Navigation */}
                                {mainNavigation.map((item) => {
                                    const isActive = pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}

                                {/* Settings with collapsible sub-nav */}
                                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                                isOnSettingsPage
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </div>
                                            <ChevronRight
                                                className={cn(
                                                    "h-4 w-4 transition-transform",
                                                    settingsOpen && "rotate-90"
                                                )}
                                            />
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pl-4 pt-1 space-y-1">
                                        {settingsNavigation
                                            .filter((item) => !item.requiredRole || item.requiredRole.includes(currentRole))
                                            .map((item) => {
                                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                        isActive
                                                            ? "bg-primary text-primary-foreground"
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </CollapsibleContent>
                                </Collapsible>
                            </nav>

                            {/* Logout */}
                            <div className="p-4 border-t mt-auto">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {isLoggingOut ? "Logging out..." : "Log out"}
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <InviteDialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                organizationName={currentOrganization.name}
            />
        </>
    );
}
