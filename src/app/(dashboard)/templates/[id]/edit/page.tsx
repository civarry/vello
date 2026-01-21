"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

        // Load the template into the store
        loadTemplate({
          id: template.id,
          name: template.name,
          blocks: template.schema.blocks,
          globalStyles: template.schema.globalStyles,
          variables: template.schema.variables,
          paperSize: template.paperSize,
          orientation: template.orientation,
        });

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

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [templateId, loadTemplate, reset]);

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

  return <TemplateBuilder />;
}
