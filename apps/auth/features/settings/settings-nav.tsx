"use client";

import { useI18n } from "@mqdms/i18n";
import { cn } from "@mqdms/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SettingsNavProps = {
  canManagePermissions: boolean;
};

export function SettingsNav({ canManagePermissions }: SettingsNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    {
      title: t("settings.nav.general"),
      href: "/settings",
    },
    {
      title: t("settings.nav.members"),
      href: "/settings/members",
    },
    {
      title: t("settings.nav.permissions"),
      href: "/settings/permissions",
      requiresPermissionManagement: true,
    },
    {
      title: t("settings.nav.profile"),
      href: "/settings/profile",
    },
    {
      title: t("settings.nav.activity"),
      href: "/settings/activity",
    },
    {
      title: t("settings.nav.apiKeys"),
      href: "/settings/api-keys",
    },
  ];

  const visibleItems = items.filter(
    (item) => !item.requiresPermissionManagement || canManagePermissions,
  );

  return (
    <nav className="flex flex-wrap gap-4">
      {visibleItems.map((item) => {
        const active =
          item.href === "/settings" ? pathname === "/settings" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "text-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
