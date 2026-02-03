import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { TemplatesList } from "@/components/templates/templates-list";

export default async function TemplatesPage() {
  const { context, error } = await getCurrentUser();

  if (!context) {
    redirect("/login");
  }

  const templates = await prisma.template.findMany({
    where: { organizationId: context.currentMembership.organization.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      paperSize: true,
      orientation: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Convert dates to strings for serialization
  const serializedTemplates = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  // Check if user can delete templates (OWNER and ADMIN only)
  const canDeleteTemplates = hasPermission(context.currentMembership.role, "templates:delete");

  return <TemplatesList initialTemplates={serializedTemplates} canDelete={canDeleteTemplates} />;
}
