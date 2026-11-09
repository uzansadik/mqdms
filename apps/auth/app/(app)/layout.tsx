import { Separator } from "@mqdms/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@mqdms/ui/components/sidebar";
import type { ReactNode } from "react";

import { requireSession } from "@/features/auth/session";
import { requireOrganization } from "@/features/organization/server";
import { AppSidebar } from "@/features/shell/app-sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireSession();
  const organization = await requireOrganization();

  return (
    <SidebarProvider>
      <AppSidebar
        isSuperadmin={session.user.role === "superadmin"}
        organization={organization}
        user={session.user}
      />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />

          <Separator className="mr-2 h-4" orientation="vertical" />

          <span className="text-sm font-medium">{organization?.name}</span>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
