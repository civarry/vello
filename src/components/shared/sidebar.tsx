"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutTemplate,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  UserPlus,
  Mail,
  Building2,
} from "lucide-react";
import { InviteDialog } from "./invite-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const navigation = [
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
];

const settingsNavigation = [
  { name: "General", href: "/settings/general", icon: Building2 },
  { name: "Members", href: "/settings/members", icon: Users },
  { name: "Email", href: "/settings/email", icon: Mail },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface SidebarProps {
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

export function Sidebar({
  user,
  currentOrganization,
  currentRole,
  allOrganizations,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [pendingOrgSwitch, setPendingOrgSwitch] = useState<{
    orgId: string;
    orgName: string;
  } | null>(null);

  // Settings collapsible state - auto-expand when on settings page
  const isOnSettingsPage = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);

  // Sync settings open state with pathname
  useEffect(() => {
    setSettingsOpen(isOnSettingsPage);
  }, [isOnSettingsPage]);

  // Get isDirty from template builder store to check for unsaved changes
  const isDirty = useTemplateBuilderStore((state) => state.isDirty);
  const resetTemplateStore = useTemplateBuilderStore((state) => state.reset);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsHydrated(true);
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

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

    // Check if on a template page with unsaved changes
    const isOnTemplatePage = pathname.match(/^\/templates\/[^/]+/);
    if (isOnTemplatePage && isDirty) {
      // Find the org name for the confirmation dialog
      const targetOrg = allOrganizations.find((org) => org.id === orgId);
      setPendingOrgSwitch({
        orgId,
        orgName: targetOrg?.name || "the selected organization",
      });
      return;
    }

    await performOrgSwitch(orgId);
  };

  const performOrgSwitch = async (orgId: string) => {
    setIsSwitching(true);
    // Close invite dialog if open before switching
    if (showInviteDialog) {
      setShowInviteDialog(false);
    }

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

      // If on a template detail page, redirect to templates list
      // (the template belongs to the old org, not the new one)
      if (pathname.match(/^\/templates\/[^/]+/)) {
        // Reset template store to clear any stale data
        resetTemplateStore();
        // Use hard navigation to ensure fresh data
        window.location.href = "/templates";
      } else {
        // Use hard navigation to ensure the sidebar gets fresh organization data
        // This ensures the checkmark and organization name update correctly
        window.location.href = pathname;
      }
    } catch (error) {
      toast.error("Failed to switch organization");
      setIsSwitching(false);
    }
  };

  const handleConfirmOrgSwitch = async () => {
    if (!pendingOrgSwitch) return;
    // Reset template store to discard changes
    resetTemplateStore();
    await performOrgSwitch(pendingOrgSwitch.orgId);
    setPendingOrgSwitch(null);
  };

  const handleCancelOrgSwitch = () => {
    setPendingOrgSwitch(null);
  };

  const handleCreateOrganization = () => {
    router.push("/onboarding?create=true");
  };

  // Prevent hydration mismatch by rendering expanded state initially
  const collapsed = isHydrated ? isCollapsed : false;

  // Don't render interactive components until hydrated to prevent ID mismatch
  if (!isHydrated) {
    return (
      <div
        className={cn(
          "hidden md:flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          "w-64"
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="Vello"
              width={32}
              height={32}
              className="rounded-lg shrink-0"
            />
            <span className="font-semibold text-lg tracking-tight">Vello</span>
          </div>
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  // Get display name
  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get role badge color - using brand palette
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

  return (
    <div
      className={cn(
        "hidden md:flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        <Link
          href="/templates"
          className={cn(
            "flex items-center overflow-hidden",
            collapsed ? "justify-center w-full" : "gap-2.5"
          )}
        >
          <Image
            src="/icon.png"
            alt="Vello"
            width={32}
            height={32}
            className="rounded-lg shrink-0"
          />
          <span
            className={cn(
              "font-semibold text-lg tracking-tight whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}
          >
            Vello
          </span>
        </Link>
      </div>

      {/* Organization Switcher */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={isSwitching}
              className={cn(
                "w-full justify-start gap-2 h-auto py-2 hover:bg-sidebar-accent text-sidebar-foreground",
                collapsed ? "justify-center px-2" : "px-2"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary text-sm font-semibold shrink-0"
                )}
              >
                {currentOrganization.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {currentOrganization.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">{currentRole}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={collapsed ? "center" : "start"}
            side="bottom"
            className="w-64"
          >
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
                onClick={() => setShowInviteDialog(true)}
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

        <InviteDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          organizationName={currentOrganization.name}
        />

        {/* Unsaved Changes Confirmation Dialog */}
        <AlertDialog
          open={pendingOrgSwitch !== null}
          onOpenChange={(open) => !open && handleCancelOrgSwitch()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes to this template. Switching to{" "}
                <span className="font-medium">{pendingOrgSwitch?.orgName}</span>{" "}
                will discard your changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelOrgSwitch}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmOrgSwitch}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2" : "gap-3",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}
              >
                {item.name}
              </span>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.name}>{linkContent}</div>;
        })}

        {/* Settings with collapsible sub-nav - Only show for OWNER and ADMIN */}
        {(currentRole === "OWNER" || currentRole === "ADMIN") && (
          <div className="lg:hidden">
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/settings/general"
                    className={cn(
                      "flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                      isOnSettingsPage
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Settings
                </TooltipContent>
              </Tooltip>
            ) : (
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isOnSettingsPage
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
                <CollapsibleContent className="pl-4 pt-1 space-y-1" forceMount>
                  {settingsNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </nav>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 hover:bg-sidebar-accent text-sidebar-foreground",
                collapsed ? "justify-center px-2" : ""
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-[oklch(0.50_0.14_200)] text-sidebar-primary-foreground text-xs font-semibold shrink-0 ring-2 ring-sidebar-primary/20">
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">{displayName}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {currentRole}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={collapsed ? "center" : "end"}
            side="top"
            className="w-56"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(currentRole === "OWNER" || currentRole === "ADMIN") && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse Toggle Button */}
      <div className="border-t border-sidebar-border p-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={cn(
                "w-full justify-center hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                collapsed ? "px-2" : "px-3"
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={10}>
              Expand sidebar
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
