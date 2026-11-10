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
import { LayoutDashboard, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/features/auth/user-menu";
import { OrganizationSwitcher } from "@/features/organization/organization-switcher";

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
  isSuperadmin: boolean;
};

const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ organization, user, isSuperadmin }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher organization={organization} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      tooltip={item.title}
                    >
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

        {isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.nav.platform")}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin" || pathname.startsWith("/admin/")}
                    tooltip={t("admin.nav.platform")}
                  >
                    <Link href="/admin">
                      <Shield />
                      <span>{t("admin.nav.platform")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
