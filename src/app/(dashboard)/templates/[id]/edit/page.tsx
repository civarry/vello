"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { loadDraft, clearDraft, getDraftAge, type TemplateDraft } from "@/lib/draft";
import { Loader2, RotateCcw, FileX } from "lucide-react";
import { toast } from "sonner";
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

const TemplateBuilder = dynamic(
  () => import("@/components/template-builder").then((mod) => mod.TemplateBuilder),
  { ssr: false, loading: () => <LoadingState /> }
);

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading template...</p>
      </div>
    </div>
  );
}

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<TemplateDraft | null>(null);
  const [serverTemplate, setServerTemplate] = useState<{
    id: string;
    name: string;
    schema: { blocks: unknown[]; globalStyles: unknown; variables: unknown[]; guides?: unknown[] };
    paperSize: string;
    orientation: string;
  } | null>(null);
  const { loadTemplate, reset } = useTemplateBuilderStore();

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/templates/${templateId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load template");
        }

        const template = result.data;
        setServerTemplate(template);

        // Check if there's a draft for this template
        const draft = loadDraft(templateId);
        if (draft) {
          // Show recovery dialog
          setPendingDraft(draft);
          setIsLoading(false);
          return;
        }

        // No draft, load server template directly
        loadServerTemplate(template);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch template:", err);
        setError(err instanceof Error ? err.message : "Failed to load template");
        toast.error(err instanceof Error ? err.message : "Failed to load template");
        setIsLoading(false);
      }
    }

    // Reset store before loading new template
    reset();
    fetchTemplate();

    // Redirect to templates list if org changes (template belongs to old org)
    const handleOrgSwitch = () => {
      router.push("/templates");
    };
    window.addEventListener("org-switched", handleOrgSwitch);

    // Cleanup on unmount
    return () => {
      reset();
      window.removeEventListener("org-switched", handleOrgSwitch);
    };
  }, [templateId, reset, router]);

  const loadServerTemplate = (template: typeof serverTemplate) => {
    if (!template) return;
    loadTemplate({
      id: template.id,
      name: template.name,
      blocks: template.schema.blocks as never[],
      globalStyles: template.schema.globalStyles as never,
      variables: template.schema.variables as never[],
      guides: template.schema.guides as never[] | undefined,
      paperSize: template.paperSize as never,
      orientation: template.orientation as never,
    });
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;

    loadTemplate({
      id: pendingDraft.templateId,
      name: pendingDraft.templateName,
      blocks: pendingDraft.blocks,
      globalStyles: pendingDraft.globalStyles,
      guides: pendingDraft.guides,
      paperSize: pendingDraft.paperSize,
      orientation: pendingDraft.orientation,
      variables: [],
    });

    // Mark as dirty since we're loading unsaved changes
    useTemplateBuilderStore.setState({ isDirty: true });

    toast.success("Draft restored successfully");
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    if (!pendingDraft) return;

    clearDraft(templateId);
    loadServerTemplate(serverTemplate);
    toast.info("Draft discarded, loaded last saved version");
    setPendingDraft(null);
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-destructive">Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push("/templates")}
            className="text-sm text-primary underline hover:no-underline"
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <TemplateBuilder />

      {/* Draft Recovery Dialog */}
      <AlertDialog open={pendingDraft !== null} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recover Unsaved Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              We found unsaved changes from{" "}
              <span className="font-medium">
                {pendingDraft && getDraftAge(pendingDraft)}
              </span>
              . Would you like to restore them or discard and load the last saved
              version?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              <FileX className="mr-2 h-4 w-4" />
              Discard Draft
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
