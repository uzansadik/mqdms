"use client";

import { authClient } from "@mqdms/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@mqdms/ui/components/sidebar";
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserMenuProps = {
  user: {
    name: string;
    email: string;
  };
  /**
   * Platform (superadmin) menüsünde organizasyon bağımlı bağlantılar
   * gösterilmez. Superadmin'in bir organizasyon üyesi olması gerekmez;
   * `/settings/*` sayfaları kurum gerektirdiği için erişilemez.
   */
  variant?: "organization" | "platform";
};

export function UserMenu({ user, variant = "organization" }: UserMenuProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    await authClient.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-muted font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>

                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>

              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-56" sideOffset={4}>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>

                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() =>
                router.push(variant === "platform" ? "/admin/profile" : "/settings/profile")
              }
            >
              <User />
              Profile
            </DropdownMenuItem>

            {variant === "organization" && (
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut}>
              <LogOut />

              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
