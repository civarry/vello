"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutTemplate,
  FileText,
  Users,
  Settings,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  ChevronDown,
  Check,
  Plus,
  UserPlus,
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
  // { name: "Payslips", href: "/payslips", icon: FileText }, // Hidden until implemented
  // { name: "Employees", href: "/employees", icon: Users }, // Hidden until implemented
  // { name: "Settings", href: "/settings", icon: Settings }, // Hidden until implemented
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
    try {
      const response = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to switch organization");
        return;
      }

      toast.success(`Switched to ${data.organization.name}`);
      // Dispatch event so client components can refetch data
      window.dispatchEvent(new CustomEvent("org-switched"));

      // If on a template detail page, redirect to templates list
      // (the template belongs to the old org, not the new one)
      if (pathname.match(/^\/templates\/[^/]+/)) {
        // Reset template store to clear any stale data
        resetTemplateStore();
        // Use replace to navigate and refresh will happen automatically
        // due to force-dynamic on the layout
        router.replace("/templates");
      } else {
        // Refresh to update sidebar with new organization
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to switch organization");
    } finally {
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

  // Get display name
  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get role badge color
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

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-muted/30 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3">
        <Link
          href="/templates"
          className={cn(
            "flex items-center gap-2 overflow-hidden",
            collapsed ? "justify-center w-full" : ""
          )}
        >
          <Building2 className="h-6 w-6 flex-shrink-0" />
          <span
            className={cn(
              "font-semibold whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}
          >
            Vello
          </span>
        </Link>
      </div>

      {/* Organization Switcher */}
      <div className={cn("border-b", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={isSwitching}
              className={cn(
                "w-full justify-start gap-2 h-auto py-2",
                collapsed ? "justify-center px-2" : "px-2"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-medium flex-shrink-0",
                  collapsed ? "" : ""
                )}
              >
                {currentOrganization.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {currentOrganization.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{currentRole}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{org.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                      getRoleBadgeClass(org.role)
                    )}
                  >
                    {org.role}
                  </span>
                </div>
                {org.id === currentOrganization.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
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
      </nav>

      {/* User Menu */}
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                collapsed ? "justify-center px-2" : ""
              )}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium flex-shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentRole}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Profile (coming soon)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              Settings (coming soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
      <div className="border-t p-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={cn(
                "w-full justify-center",
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
