"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  FileOutput,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  paperSize: string;
  orientation: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/templates");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch templates");
      }

      setTemplates(result.data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/templates/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete template");
      }

      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/duplicate`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to duplicate template");
      }

      toast.success("Template duplicated");
      fetchTemplates();
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate template"
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Empty state - show welcoming onboarding experience
  if (!isLoading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 lg:p-8">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <FileText className="h-10 w-10" />
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Create your first template
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Design a custom payslip layout once, then generate documents for all your employees with ease.
          </p>

          {/* Features preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-sm">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-muted-foreground font-medium">Visual Builder</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileOutput className="h-5 w-5" />
              </div>
              <span className="text-muted-foreground font-medium">PDF Export</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Copy className="h-5 w-5" />
              </div>
              <span className="text-muted-foreground font-medium">Reusable</span>
            </div>
          </div>

          {/* CTA */}
          <Link href="/templates/new">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 group">
              <Plus className="mr-2 h-5 w-5" />
              Create Template
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header - only shown when templates exist */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Design and manage your payslip templates
          </p>
        </div>
        <Link href="/templates/new">
          <Button className="shadow-lg w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1">
          {templates.map((template) => (
            <Card key={template.id} className="group relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate group-hover:text-primary transition-colors font-semibold">
                        {template.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {template.paperSize} · {template.orientation}
                      </span>
                    </div>
                    {template.isDefault && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
                        Default
                      </span>
                    )}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/templates/${template.id}/generate`)
                        }
                      >
                        <FileOutput className="mr-2 h-4 w-4" />
                        Generate Document
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/templates/${template.id}/edit`)
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteId(template.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2 mt-1 pl-12">
                  {template.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 pl-12">
                  <Link href={`/templates/${template.id}/generate`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full">
                      <FileOutput className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </Link>
                  <Link href={`/templates/${template.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground pl-12">
                  Updated {formatDate(template.updatedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
