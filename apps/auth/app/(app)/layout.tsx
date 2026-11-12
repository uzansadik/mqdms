import { Separator } from "@mqdms/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@mqdms/ui/components/sidebar";
import type { ReactNode } from "react";

import { requireRequestContext } from "@/features/auth/context";
import { AppSidebar } from "@/features/shell/app-sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  /*
   * Oturum ve organizasyon erişimi burada doğrulanır. Bu birinci güvenlik
   * katmanıdır; her server action kendi yetki kontrolünü ayrıca yapar.
   */
  const context = await requireRequestContext();

  return (
    <SidebarProvider>
      <AppSidebar
        isOwner={context.isOwner}
        organization={{
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
        }}
        user={{
          id: context.user.id,
          name: context.user.name,
          email: context.user.email,
        }}
      />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />

          <Separator className="mr-2 h-4" orientation="vertical" />

          <span className="text-sm font-medium">{context.organization.name}</span>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
