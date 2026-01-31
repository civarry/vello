"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
        <p className="text-sm text-muted-foreground">Loading builder...</p>
      </div>
    </div>
  );
}

export interface InitialTemplate {
  id: string;
  name: string;
  schema: {
    blocks: unknown[];
    globalStyles: unknown;
    variables: unknown[];
    guides?: unknown[];
  };
  paperSize: string;
  orientation: string;
}

interface EditTemplateClientProps {
  templateId: string;
  initialTemplate: InitialTemplate;
}

export function EditTemplateClient({ templateId, initialTemplate }: EditTemplateClientProps) {
  const router = useRouter();
  const [pendingDraft, setPendingDraft] = useState<TemplateDraft | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { loadTemplate, reset } = useTemplateBuilderStore();

  useEffect(() => {
    // Reset store before loading new template
    reset();

    // Check if there's a draft for this template
    const draft = loadDraft(templateId);
    if (draft) {
      // Show recovery dialog
      setPendingDraft(draft);
    } else {
      // No draft, load server template directly
      loadServerTemplate(initialTemplate);
    }
    setIsReady(true);

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
  }, [templateId, reset, router, initialTemplate]);

  const loadServerTemplate = (template: InitialTemplate) => {
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
    loadServerTemplate(initialTemplate);
    toast.info("Draft discarded, loaded last saved version");
    setPendingDraft(null);
  };

  if (!isReady) {
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
