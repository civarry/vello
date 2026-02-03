import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { GenerateDocumentsClient } from "@/components/templates/generate-documents-client";
import type { Template, TemplateSchema } from "@/types/template";

interface GenerateDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerateDocumentsPage({ params }: GenerateDocumentsPageProps) {
  const { id } = await params;
  const { context } = await getCurrentUser();

  if (!context) {
    redirect("/login");
  }

  // Fetch template
  const template = await prisma.template.findFirst({
    where: {
      id,
      organizationId: context.currentMembership.organization.id,
    },
  });

  if (!template) {
    notFound();
  }

  // Check if user can send emails (OWNER and ADMIN only)
  const canSendEmails = hasPermission(context.currentMembership.role, "templates:send");

  // Check for SMTP config if user has send permission
  let hasSmtpConfig = false;
  let smtpConfig: { emailSubject?: string; emailBody?: string; senderName?: string } | null = null;

  if (canSendEmails) {
    const config = await prisma.sMTPConfiguration.findFirst({
      where: {
        organizationId: context.currentMembership.organization.id,
        isDefault: true,
      },
      select: {
        emailSubject: true,
        emailBody: true,
        senderName: true,
      },
    });

    if (config) {
      hasSmtpConfig = true;
      smtpConfig = {
        emailSubject: config.emailSubject || undefined,
        emailBody: config.emailBody || undefined,
        senderName: config.senderName || undefined,
      };
    }
  }

  // Serialize template for client component
  const initialTemplate: Template = {
    id: template.id,
    name: template.name,
    schema: template.schema as unknown as TemplateSchema,
    paperSize: template.paperSize as Template["paperSize"],
    orientation: template.orientation as Template["orientation"],
    templateType: template.templateType as Template["templateType"],
    recipientEmailField: template.recipientEmailField,
    recipientNameField: template.recipientNameField,
  };

  return (
    <GenerateDocumentsClient
      templateId={id}
      initialTemplate={initialTemplate}
      hasSmtpConfig={hasSmtpConfig}
      smtpConfig={smtpConfig}
      organizationName={context.currentMembership.organization.name}
      canSendEmails={canSendEmails}
    />
  );
}
