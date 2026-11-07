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

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4">
      {items.map((item) => {
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
