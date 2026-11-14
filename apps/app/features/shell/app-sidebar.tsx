"use client";

import { env } from "@mqdms/env/client";
import { useI18n } from "@mqdms/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@mqdms/ui/components/sidebar";
import {
  Boxes,
  Building2,
  Factory,
  FileSpreadsheet,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
  Network,
  Package,
  Ruler,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppSidebarProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    name: string;
    email: string;
  };
  /** Efektif yetkilere göre görünürlük. */
  visibleModules: string[];
};

export function AppSidebar({ organization, user, visibleModules }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    {
      title: t("app.nav.dashboard"),
      href: "/",
      icon: LayoutDashboard,
      module: "dashboard",
    },
    {
      title: t("app.nav.fmea"),
      href: "/fmea",
      icon: FileSpreadsheet,
      module: "fmea",
    },
    {
      title: t("app.nav.synoptic"),
      href: "/synoptic",
      icon: Network,
      module: "synoptic",
    },
  ].filter((item) => visibleModules.includes(item.module));

  const management = [
    {
      title: t("app.nav.customers"),
      href: "/customers",
      icon: Building2,
      module: "customers",
    },
    {
      title: t("app.nav.plants"),
      href: "/plants",
      icon: Factory,
      module: "plants",
    },
    {
      title: t("app.nav.projects"),
      href: "/projects",
      icon: FolderKanban,
      module: "projects",
    },
  ].filter((item) => visibleModules.includes(item.module));

  const productManagement = [
    {
      title: t("app.nav.items"),
      href: "/items",
      icon: Package,
      module: "items",
    },
    {
      title: t("app.nav.itemGroups"),
      href: "/item-groups",
      icon: FolderTree,
      module: "itemGroups",
    },
    {
      title: t("app.nav.boms"),
      href: "/boms",
      icon: Boxes,
      module: "boms",
    },
    {
      title: t("app.nav.units"),
      href: "/units",
      icon: Ruler,
      module: "units",
    },
    {
      title: t("app.nav.imports"),
      href: "/imports",
      icon: Upload,
      module: "imports",
    },
  ].filter((item) => visibleModules.includes(item.module));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                {organization.name.charAt(0).toUpperCase()}
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{organization.name}</span>

                <span className="truncate text-xs">{organization.slug}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("app.nav.modules")}</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;

                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {management.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("app.nav.management")}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {management.map((item) => {
                  const Icon = item.icon;

                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {productManagement.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("app.nav.productManagement")}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {productManagement.map((item) => {
                  const Icon = item.icon;

                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <UserRound className="size-4 shrink-0 text-muted-foreground" />

          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>

            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <a
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          href={env.NEXT_PUBLIC_AUTH_URL}
        >
          {t("app.nav.account")}
        </a>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
