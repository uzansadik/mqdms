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
import { KeyRound, LayoutDashboard, ScrollText, Settings, ShieldCheck, Users } from "lucide-react";
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
    id: string;
    name: string;
    email: string;
  };
  /** Kullanıcı organizasyonun sahibi mi? Yönetim ekranları yalnızca owner'a açıktır. */
  isOwner: boolean;
};

export function AppSidebar({ organization, user, isOwner }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    {
      title: t("navigation.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("navigation.organization"),
      href: "/organization",
      icon: Settings,
    },
  ];

  const ownerNavigation = [
    {
      title: t("settings.nav.members"),
      href: "/organization/members",
      icon: Users,
    },
    {
      title: t("settings.nav.roles"),
      href: "/organization/roles",
      icon: ShieldCheck,
    },
    {
      title: t("settings.nav.permissions"),
      href: "/organization/permissions",
      icon: KeyRound,
    },
    {
      title: t("settings.nav.activity"),
      href: "/organization/activity",
      icon: ScrollText,
    },
  ];

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

        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("organization.management")}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {ownerNavigation.map((item) => {
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
        )}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
