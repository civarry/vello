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
import { Sheet } from "@/components/ui/sheet";
import {
  Loader2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  UserPlus,
  UserMinus,
  Settings,
  Mail,
  Trash2,
  Copy,
  LayoutTemplate,
  Shield,
  Eye,
  Star,
  FileSpreadsheet,
  UserX,
  Crown,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AuditLog, AuditLogDetails } from "@/components/audit-log/audit-log-details";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  // Templates
  { value: "TEMPLATE_CREATED", label: "Template Created" },
  { value: "TEMPLATE_EDITED", label: "Template Edited" },
  { value: "TEMPLATE_DELETED", label: "Template Deleted" },
  { value: "TEMPLATE_DUPLICATED", label: "Template Duplicated" },
  { value: "TEMPLATE_SET_DEFAULT", label: "Template Set as Default" },
  // Documents
  { value: "DOCUMENT_GENERATED", label: "Document Generated" },
  { value: "DOCUMENT_BATCH_GENERATED", label: "Batch Documents Generated" },
  { value: "EXCEL_IMPORTED", label: "Excel Data Imported" },
  { value: "DOCUMENT_SENT", label: "Document Sent" },
  { value: "DOCUMENT_BATCH_SENT", label: "Batch Documents Sent" },
  // Team
  { value: "MEMBER_INVITED", label: "Member Invited" },
  { value: "INVITE_REVOKED", label: "Invite Revoked" },
  { value: "MEMBER_REMOVED", label: "Member Removed" },
  { value: "MEMBER_ROLE_CHANGED", label: "Role Changed" },
  { value: "OWNERSHIP_TRANSFERRED", label: "Ownership Transferred" },
  { value: "MEMBER_LEFT", label: "Member Left" },
  // Organization
  { value: "ORG_UPDATED", label: "Organization Updated" },
  { value: "ORG_DELETED", label: "Organization Deleted" },
  // Settings
  { value: "SMTP_CONFIG_ADDED", label: "Email Config Added" },
  { value: "SMTP_CONFIG_UPDATED", label: "Email Config Updated" },
  { value: "SMTP_CONFIG_DELETED", label: "Email Config Deleted" },
  // Parameters
  { value: "PARAMETER_CREATED", label: "Parameter Created" },
  { value: "PARAMETER_UPDATED", label: "Parameter Updated" },
  { value: "PARAMETER_DELETED", label: "Parameter Deleted" },
  // Audit
  { value: "AUDIT_LOGS_EXPORTED", label: "Audit Logs Exported" },
];

function getActionIcon(action: string) {
  // Templates
  if (action.includes("TEMPLATE")) {
    if (action.includes("DELETED")) return <Trash2 className="h-4 w-4 text-destructive" />;
    if (action.includes("DUPLICATED")) return <Copy className="h-4 w-4 text-blue-500" />;
    if (action.includes("SET_DEFAULT")) return <Star className="h-4 w-4 text-amber-500" />;
    return <LayoutTemplate className="h-4 w-4 text-purple-500" />;
  }
  // Documents
  if (action.includes("EXCEL")) {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (action.includes("DOCUMENT")) {
    if (action.includes("SENT")) return <Mail className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  // Team
  if (action.includes("OWNERSHIP")) {
    return <Crown className="h-4 w-4 text-amber-500" />;
  }
  if (action.includes("INVITE_REVOKED")) {
    return <UserX className="h-4 w-4 text-orange-500" />;
  }
  if (action.includes("MEMBER_LEFT")) {
    return <LogOut className="h-4 w-4 text-muted-foreground" />;
  }
  if (action.includes("MEMBER") || action.includes("INVITE")) {
    if (action.includes("INVITED")) return <UserPlus className="h-4 w-4 text-green-600" />;
    if (action.includes("REMOVED")) return <UserMinus className="h-4 w-4 text-destructive" />;
    if (action.includes("ROLE")) return <Shield className="h-4 w-4 text-orange-500" />;
  }
  // Parameters
  if (action.includes("PARAMETER")) {
    if (action.includes("DELETED")) return <Trash2 className="h-4 w-4 text-destructive" />;
    return <Settings className="h-4 w-4 text-teal-500" />;
  }
  // Organization & Settings
  if (action.includes("ORG_DELETED")) {
    return <Trash2 className="h-4 w-4 text-destructive" />;
  }
  if (action.includes("SMTP") || action.includes("ORG")) {
    return <Settings className="h-4 w-4 text-muted-foreground" />;
  }
  // Audit
  if (action.includes("AUDIT")) {
    return <ClipboardList className="h-4 w-4 text-primary" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
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
  }, [fetchLogs]);

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
    <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shield className="h-4 w-4 text-primary" />
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
            <Shield className="h-4 w-4 text-primary" />
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
                <div className="flex flex-col xl:flex-row gap-4">
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
                          <TableHead className="w-[180px] p-4">User</TableHead>
                          <TableHead className="p-4">Action</TableHead>
                          <TableHead className="hidden xl:table-cell p-4">Resource</TableHead>
                          <TableHead className="w-[80px] text-right p-4">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium uppercase">
                                  {log.userName.slice(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{log.userName}</span>
                                  <span className="text-xs text-muted-foreground">{log.userEmail.split('@')[0]}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  {getActionIcon(log.action)}
                                  <span className="text-sm font-medium">{log.actionDescription}</span>
                                </div>
                                <span className="text-xs text-muted-foreground pl-6">
                                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell p-4">
                              {log.resourceName ? (
                                <div className="flex flex-col">
                                  <span className="text-sm">{log.resourceName}</span>
                                  <span className="text-xs text-muted-foreground">{log.resourceType || 'Resource'}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right p-4">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
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
      <AuditLogDetails log={selectedLog} />
    </Sheet>
  );
}
