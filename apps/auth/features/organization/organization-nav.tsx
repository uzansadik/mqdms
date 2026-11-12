"use client";

import { useI18n } from "@mqdms/i18n";
import { cn } from "@mqdms/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

type OrganizationNavProps = {
  /** Yönetim ekranları yalnızca owner'a açıktır. */
  isOwner: boolean;
};

export function OrganizationNav({ isOwner }: OrganizationNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    {
      title: t("settings.nav.general"),
      href: "/organization",
    },
    {
      title: t("settings.nav.members"),
      href: "/organization/members",
      ownerOnly: true,
    },
    {
      title: t("settings.nav.roles"),
      href: "/organization/roles",
      ownerOnly: true,
    },
    {
      title: t("settings.nav.permissions"),
      href: "/organization/permissions",
      ownerOnly: true,
    },
    {
      title: t("settings.nav.invitations"),
      href: "/organization/invitations",
      ownerOnly: true,
    },
    {
      title: t("settings.nav.activity"),
      href: "/organization/activity",
      ownerOnly: true,
    },
    {
      title: t("settings.nav.apiKeys"),
      href: "/organization/api-keys",
      ownerOnly: true,
    },
  ];

  const visibleItems = items.filter((item) => !item.ownerOnly || isOwner);

  return (
    <nav className="flex flex-wrap gap-4">
      {visibleItems.map((item) => {
        const active =
          item.href === "/organization"
            ? pathname === "/organization"
            : pathname.startsWith(item.href);

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
