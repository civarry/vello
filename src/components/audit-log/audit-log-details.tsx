"use client";

import {
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    User,
    Shield,
    Database,
    Info,
    ArrowRight,
    Hash,
    Mail,
    FileText,
    Users,
    Calendar,
    Filter,
    LayoutTemplate,
    Settings,
} from "lucide-react";

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: "OWNER" | "ADMIN" | "MEMBER";
    action: string;
    actionDescription: string;
    resourceType: string | null;
    resourceId: string | null;
    resourceName: string | null;
    metadata: Record<string, unknown> | null;
}

interface AuditLogDetailsProps {
    log: AuditLog | null;
}

export function AuditLogDetails({ log }: AuditLogDetailsProps) {
    if (!log) return null;

    return (
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader className="pb-4 border-b">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-normal font-mono">
                        {log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                </div>
                <SheetTitle className="text-xl">{log.actionDescription}</SheetTitle>
                <SheetDescription>
                    Detailed information about this event.
                </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-6 py-6">
                {/* Actor Section */}
                <section>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-primary" />
                        Actor
                    </h3>
                    <div className="bg-muted/30 rounded-lg border divide-y divide-border/50">
                        <DetailRow label="Name" value={log.userName} />
                        <DetailRow label="Email" value={log.userEmail} mono />
                        <DetailRow
                            label="Role"
                            value={
                                <Badge variant="secondary" className="text-xs">
                                    {log.userRole}
                                </Badge>
                            }
                        />
                        <DetailRow
                            label="User ID"
                            value={log.userId}
                            mono
                            muted
                            icon={<Shield className="h-3 w-3" />}
                        />
                    </div>
                </section>

                {/* Resource Section */}
                {(log.resourceType || log.resourceName) && (
                    <section>
                        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                            <Database className="h-4 w-4 text-primary" />
                            Target Resource
                        </h3>
                        <div className="bg-muted/30 rounded-lg border divide-y divide-border/50">
                            {log.resourceName && (
                                <DetailRow label="Name" value={log.resourceName} />
                            )}
                            {log.resourceType && (
                                <DetailRow
                                    label="Type"
                                    value={
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {log.resourceType}
                                        </Badge>
                                    }
                                />
                            )}
                            {log.resourceId && (
                                <DetailRow label="ID" value={log.resourceId} mono muted />
                            )}
                        </div>
                    </section>
                )}

                {/* Changes Section */}
                {renderChanges(log)}

                {/* Additional Details Section */}
                {renderAdditionalDetails(log)}
            </div>
        </SheetContent>
    );
}

interface DetailRowProps {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    muted?: boolean;
    icon?: React.ReactNode;
}

function DetailRow({ label, value, mono, muted, icon }: DetailRowProps) {
    return (
        <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                {icon}
                {label}
            </span>
            <span
                className={`text-sm ${mono ? "font-mono" : ""} ${muted ? "text-muted-foreground text-xs" : "font-medium"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}

function renderChanges(log: AuditLog) {
    if (!log.metadata) return null;

    // Handle Role Changes
    if (log.action === "MEMBER_ROLE_CHANGED") {
        const { previousRole, newRole } = log.metadata;
        if (previousRole && newRole) {
            return (
                <section>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        Role Change
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-5 border">
                        <div className="flex items-center justify-center gap-6">
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-2">From</div>
                                <Badge variant="outline" className="text-muted-foreground line-through">
                                    {String(previousRole)}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                                <ArrowRight className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-2">To</div>
                                <Badge>{String(newRole)}</Badge>
                            </div>
                        </div>
                    </div>
                </section>
            );
        }
    }

    // Handle Ownership Transfer
    if (log.action === "OWNERSHIP_TRANSFERRED") {
        const { newOwnerEmail, newOwnerName } = log.metadata;
        if (newOwnerEmail) {
            return (
                <section>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        Ownership Transfer
                    </h3>
                    <div className="bg-muted/30 rounded-lg border divide-y divide-border/50">
                        <DetailRow label="New Owner" value={String(newOwnerName || newOwnerEmail)} />
                        <DetailRow label="Email" value={String(newOwnerEmail)} mono />
                    </div>
                </section>
            );
        }
    }

    // Handle "changes" array
    const changes = log.metadata.changes as Array<{ field: string; old?: unknown; new?: unknown } | string> | undefined;
    if (changes && Array.isArray(changes) && changes.length > 0) {
        return (
            <section>
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Changes
                </h3>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Field</th>
                                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Before</th>
                                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">After</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {changes.map((change, i) => {
                                if (typeof change === "string") {
                                    return (
                                        <tr key={i} className="hover:bg-muted/20">
                                            <td className="px-4 py-2.5 font-medium text-sm" colSpan={3}>{change}</td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={i} className="hover:bg-muted/20">
                                        <td className="px-4 py-2.5 font-medium text-sm">{change.field}</td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-destructive/80 break-all">
                                            {formatValue(change.old)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-green-600 dark:text-green-400 break-all">
                                            {formatValue(change.new)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    return null;
}

function renderAdditionalDetails(log: AuditLog) {
    if (!log.metadata) return null;

    // Skip if we already rendered specialized views
    if (log.action === "MEMBER_ROLE_CHANGED" && log.metadata.previousRole && log.metadata.newRole) {
        return null;
    }
    if (log.action === "OWNERSHIP_TRANSFERRED" && log.metadata.newOwnerEmail) {
        return null;
    }
    if (log.metadata.changes && Array.isArray(log.metadata.changes) && log.metadata.changes.length > 0) {
        return null;
    }

    // Extract meaningful metadata fields
    const details = extractDetails(log.action, log.metadata);
    if (details.length === 0) return null;

    return (
        <section>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                Additional Details
            </h3>
            <div className="bg-muted/30 rounded-lg border divide-y divide-border/50">
                {details.map((detail, i) => (
                    <DetailRow
                        key={i}
                        label={detail.label}
                        value={detail.value}
                        mono={detail.mono}
                        icon={detail.icon}
                    />
                ))}
            </div>
        </section>
    );
}

interface DetailItem {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    icon?: React.ReactNode;
}

function extractDetails(action: string, metadata: Record<string, unknown>): DetailItem[] {
    const details: DetailItem[] = [];

    // Audit log export details
    if (action === "AUDIT_LOGS_EXPORTED") {
        if (metadata.recordCount !== undefined) {
            details.push({
                label: "Records Exported",
                value: String(metadata.recordCount),
                icon: <FileText className="h-3 w-3" />,
            });
        }
        const filters = metadata.filters as Record<string, unknown> | undefined;
        if (filters) {
            if (filters.action) {
                details.push({
                    label: "Action Filter",
                    value: <Badge variant="outline" className="text-xs font-mono">{String(filters.action)}</Badge>,
                    icon: <Filter className="h-3 w-3" />,
                });
            }
            if (filters.startDate || filters.endDate) {
                const dateRange = [filters.startDate, filters.endDate].filter(Boolean).join(" to ");
                details.push({
                    label: "Date Range",
                    value: dateRange,
                    icon: <Calendar className="h-3 w-3" />,
                });
            }
        }
        return details;
    }

    // Document generation details
    if (action.includes("DOCUMENT")) {
        if (metadata.count !== undefined) {
            details.push({
                label: "Documents",
                value: String(metadata.count),
                icon: <FileText className="h-3 w-3" />,
            });
        }
        if (metadata.recipientCount !== undefined) {
            details.push({
                label: "Recipients",
                value: String(metadata.recipientCount),
                icon: <Users className="h-3 w-3" />,
            });
        }
        if (metadata.templateName) {
            details.push({
                label: "Template",
                value: String(metadata.templateName),
                icon: <LayoutTemplate className="h-3 w-3" />,
            });
        }
    }

    // Member invite details
    if (action === "MEMBER_INVITED" || action === "INVITE_REVOKED") {
        if (metadata.inviteeEmail) {
            details.push({
                label: "Email",
                value: String(metadata.inviteeEmail),
                mono: true,
                icon: <Mail className="h-3 w-3" />,
            });
        }
        if (metadata.role) {
            details.push({
                label: "Role",
                value: <Badge variant="secondary" className="text-xs">{String(metadata.role)}</Badge>,
                icon: <Shield className="h-3 w-3" />,
            });
        }
    }

    // Member removal details
    if (action === "MEMBER_REMOVED" || action === "MEMBER_LEFT") {
        if (metadata.memberEmail) {
            details.push({
                label: "Member",
                value: String(metadata.memberEmail),
                mono: true,
                icon: <Mail className="h-3 w-3" />,
            });
        }
    }

    // SMTP config details
    if (action.includes("SMTP")) {
        if (metadata.configName) {
            details.push({
                label: "Configuration",
                value: String(metadata.configName),
                icon: <Settings className="h-3 w-3" />,
            });
        }
        if (metadata.host) {
            details.push({
                label: "Host",
                value: String(metadata.host),
                mono: true,
            });
        }
    }

    // Excel import details
    if (action === "EXCEL_IMPORTED") {
        if (metadata.rowCount !== undefined) {
            details.push({
                label: "Rows Imported",
                value: String(metadata.rowCount),
                icon: <Hash className="h-3 w-3" />,
            });
        }
        if (metadata.fileName) {
            details.push({
                label: "File",
                value: String(metadata.fileName),
                icon: <FileText className="h-3 w-3" />,
            });
        }
    }

    // Generic fallback for unhandled metadata
    if (details.length === 0) {
        const ignoredKeys = ["changes", "previousRole", "newRole", "newOwnerEmail", "newOwnerName"];
        const entries = Object.entries(metadata).filter(
            ([key, value]) => !ignoredKeys.includes(key) && value !== null && value !== undefined
        );

        for (const [key, value] of entries.slice(0, 5)) {
            details.push({
                label: formatLabel(key),
                value: formatValue(value),
                mono: typeof value === "string" && (value.includes("@") || value.length > 20),
            });
        }
    }

    return details;
}

function formatLabel(key: string): string {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}
