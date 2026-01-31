import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { EditTemplateClient } from "@/components/templates/edit-template-client";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;
  const { context } = await getCurrentUser();

  if (!context) {
    redirect("/login");
  }

  const template = await prisma.template.findFirst({
    where: {
      id,
      organizationId: context.currentMembership.organization.id,
    },
    select: {
      id: true,
      name: true,
      schema: true,
      paperSize: true,
      orientation: true,
    },
  });

  if (!template) {
    notFound();
  }

  // Serialize for client component
  const initialTemplate = {
    id: template.id,
    name: template.name,
    schema: template.schema as {
      blocks: unknown[];
      globalStyles: unknown;
      variables: unknown[];
      guides?: unknown[];
    },
    paperSize: template.paperSize,
    orientation: template.orientation,
  };

  return <EditTemplateClient templateId={id} initialTemplate={initialTemplate} />;
}
