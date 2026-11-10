import { getTranslations } from "@mqdms/i18n/server";
import { Separator } from "@mqdms/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@mqdms/ui/components/sidebar";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { requireSuperadmin } from "@/features/admin/server";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const t = await getTranslations();

  const session = await requireSuperadmin();

  return (
    <SidebarProvider>
      <AdminSidebar user={session.user} />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />

          <Separator className="mr-2 h-4" orientation="vertical" />

          <span className="text-sm font-medium">{t("admin.layout.title")}</span>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
