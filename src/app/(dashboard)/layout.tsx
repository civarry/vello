import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { Sidebar } from "@/components/shared/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Get the user with all their memberships
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: {
      memberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  // If user doesn't exist or has no memberships, redirect to onboarding
  if (!user || user.memberships.length === 0) {
    redirect("/onboarding");
  }

  // Determine current organization
  let currentMembership = user.memberships.find(
    (m) => m.organization.id === user.currentOrganizationId
  );

  // Fallback to first membership if currentOrganizationId is invalid
  if (!currentMembership) {
    currentMembership = user.memberships[0];
    // Update the user's currentOrganizationId in background (fire and forget)
    prisma.user.update({
      where: { id: user.id },
      data: { currentOrganizationId: currentMembership.organization.id },
    }).catch(console.error);
  }

  // Map memberships to the format expected by Sidebar
  const allOrganizations = user.memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  return (
    <div className="flex h-screen">
      <Sidebar
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
        }}
        currentOrganization={{
          id: currentMembership.organization.id,
          name: currentMembership.organization.name,
        }}
        currentRole={currentMembership.role}
        allOrganizations={allOrganizations}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
