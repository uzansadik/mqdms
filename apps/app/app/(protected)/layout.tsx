import { Separator } from "@mqdms/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@mqdms/ui/components/sidebar";
import type { ReactNode } from "react";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { AppSidebar } from "@/features/shell/app-sidebar";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  /*
   * Oturum ve organizasyon erişimi burada doğrulanır. Bu birinci güvenlik
   * katmanıdır; her server action kendi yetki kontrolünü ayrıca yapar.
   */
  const context = await requireAuthContext();

  /*
   * Menü görünürlüğü efektif yetkilere göre belirlenir. Bu yalnızca UX'tir:
   * sayfa ve aksiyon koruması `requirePermission` ile yapılır.
   */
  const visibleModules = ["dashboard"];

  if (await canAccess(context, "fmea", "read")) {
    visibleModules.push("fmea");
  }

  if (await canAccess(context, "synoptic", "read")) {
    visibleModules.push("synoptic");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        organization={{
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
        }}
        user={{
          name: context.user.name,
          email: context.user.email,
        }}
        visibleModules={visibleModules}
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
