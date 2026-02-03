"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ClipboardList,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface AuditLog {
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
  ipAddress: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  { value: "TEMPLATE_CREATED", label: "Template Created" },
  { value: "TEMPLATE_EDITED", label: "Template Edited" },
  { value: "TEMPLATE_DELETED", label: "Template Deleted" },
  { value: "TEMPLATE_DUPLICATED", label: "Template Duplicated" },
  { value: "DOCUMENT_GENERATED", label: "Document Generated" },
  { value: "DOCUMENT_BATCH_GENERATED", label: "Batch Documents Generated" },
  { value: "DOCUMENT_SENT", label: "Document Sent" },
  { value: "DOCUMENT_BATCH_SENT", label: "Batch Documents Sent" },
  { value: "MEMBER_INVITED", label: "Member Invited" },
  { value: "MEMBER_REMOVED", label: "Member Removed" },
  { value: "MEMBER_ROLE_CHANGED", label: "Role Changed" },
  { value: "ORG_UPDATED", label: "Organization Updated" },
  { value: "SMTP_CONFIG_ADDED", label: "Email Config Added" },
  { value: "SMTP_CONFIG_UPDATED", label: "Email Config Updated" },
  { value: "SMTP_CONFIG_DELETED", label: "Email Config Deleted" },
];

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "OWNER":
      return "default";
    case "ADMIN":
      return "secondary";
    default:
      return "outline";
  }
}

function getActionColor(action: string): string {
  if (action.includes("DELETED") || action.includes("REMOVED")) {
    return "text-destructive";
  }
  if (action.includes("CREATED") || action.includes("ADDED") || action.includes("INVITED")) {
    return "text-green-600 dark:text-green-400";
  }
  if (action.includes("SENT")) {
    return "text-blue-600 dark:text-blue-400";
  }
  return "text-muted-foreground";
}

function renderMetadataDetails(log: AuditLog) {
  if (!log.metadata) return null;

  // Handle Role Changes
  if (log.action === "MEMBER_ROLE_CHANGED") {
    const { previousRole, newRole } = log.metadata;
    if (previousRole && newRole) {
      return (
        <div className="mt-1.5 text-xs bg-muted/40 p-1.5 rounded border border-border/40 inline-block">
          <span className="text-muted-foreground line-through mr-1">{String(previousRole)}</span>
          <span className="text-muted-foreground mr-1">→</span>
          <span className="font-medium text-foreground">{String(newRole)}</span>
        </div>
      );
    }
  }

  // Handle "changes" array (Templates, Org, SMTP)
  const changes = log.metadata.changes as Array<any> | undefined;
  if (changes && Array.isArray(changes) && changes.length > 0) {
    return (
      <div className="mt-1.5 space-y-1">
        {changes.map((change, i) => {
          // Handle legacy format (array of strings)
          if (typeof change === "string") {
            return (
              <div key={i} className="text-xs bg-muted/40 p-1.5 rounded border border-border/40">
                <span className="text-muted-foreground">Changed field: </span>
                <span className="font-medium text-foreground">{change}</span>
              </div>
            );
          }
          // Handle new format (array of objects)
          return (
            <div key={i} className="text-xs bg-muted/40 p-1.5 rounded border border-border/40">
              <span className="font-medium text-foreground mr-1.5">{change.field}:</span>
              <span className="text-muted-foreground line-through mr-1">{String(change.old)}</span>
              <span className="text-muted-foreground mr-1">→</span>
              <span className="font-medium text-foreground">{String(change.new)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });

      if (actionFilter && actionFilter !== "all") {
        params.set("action", actionFilter);
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch audit logs");
      }

      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, startDate, endDate, pagination.limit]);

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, startDate, endDate]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== "all") {
        params.set("action", actionFilter);
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to export audit logs");
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit logs exported successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-base">Audit Log</h1>
            <p className="text-xs text-muted-foreground">
              Track activity and changes in your organization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Audit Log</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="action-filter" className="text-xs text-muted-foreground mb-1.5 block">
                    Action Type
                  </Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger id="action-filter">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground mb-1.5 block">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground mb-1.5 block">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading audit logs...</p>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No audit logs found</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your filters or check back later
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            <div className="space-y-1">
                              <div>{format(new Date(log.timestamp), "MMM d, yyyy")}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(log.timestamp), "h:mm a")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{log.userName}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getRoleBadgeVariant(log.userRole)} className="text-[10px] px-1.5 py-0">
                                  {log.userRole}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className={`text-sm font-medium ${getActionColor(log.action)}`}>
                                {log.actionDescription}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                              </div>
                              {renderMetadataDetails(log)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.resourceName && (
                              <div className="space-y-1">
                                <div className="text-sm">{log.resourceName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {log.resourceType}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
