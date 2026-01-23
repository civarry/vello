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

  // Get the user from our database
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // If user doesn't have an organization, redirect to onboarding
  if (!user) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }}
        organization={{
          id: user.organization.id,
          name: user.organization.name,
        }}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
