"use client";

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
import { Building2, KeyRound, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/features/auth/user-menu";

type AdminSidebarProps = {
  user: {
    name: string;
    email: string;
  };
};

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    {
      title: t("admin.nav.overview"),
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: t("admin.nav.organizations"),
      href: "/admin/organizations",
      icon: Building2,
    },
    {
      title: t("admin.nav.users"),
      href: "/admin/users",
      icon: Users,
    },
    {
      title: t("admin.nav.applications"),
      href: "/admin/oauth-clients",
      icon: KeyRound,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-xs font-semibold">P</span>
          </div>

          <span className="text-sm font-semibold">{t("admin.nav.platform")}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("admin.nav.management")}</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;

                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
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
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} variant="platform" />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
