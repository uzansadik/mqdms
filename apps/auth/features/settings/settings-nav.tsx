"use client";

import { cn } from "@mqdms/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "General",
    href: "/settings",
  },
  {
    title: "Members",
    href: "/settings/members",
  },
  {
    title: "Permissions",
    href: "/settings/permissions",
    requiresPermissionManagement: true,
  },
  {
    title: "Profile",
    href: "/settings/profile",
  },
  {
    title: "Activity",
    href: "/settings/activity",
  },
  {
    title: "API Keys",
    href: "/settings/api-keys",
  },
];

type SettingsNavProps = {
  canManagePermissions: boolean;
};

export function SettingsNav({ canManagePermissions }: SettingsNavProps) {
  const pathname = usePathname();

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
