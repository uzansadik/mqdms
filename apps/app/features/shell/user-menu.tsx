"use client";

import { authClient } from "@mqdms/auth/client";
import { env } from "@mqdms/env/client";
import { useI18n } from "@mqdms/i18n";
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
import { toast } from "sonner";
import { useState } from "react";

type UserMenuProps = {
  user: {
    name: string;
    email: string;
  };
};

/**
 * Kullanıcı menüsü.
 *
 * Çıkış merkezidir: oturum revoke edilir ve cookie temizlenir. Cookie
 * `.mqdms.com` alan adında yazıldığı için her iki deploy'ta da geçersiz olur.
 */
export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    const { error } = await authClient.signOut();

    if (error) {
      /*
       * Çıkış başarısızsa yönlendirme yapılmaz: kullanıcı oturumu hâlâ
       * geçerliyken giriş ekranına düşerse ne olacağı belirsiz hâle gelir.
       */
      toast.error(error.message ?? t("app.userMenu.signOutFailed"));

      setIsSigningOut(false);

      return;
    }

    window.location.assign(`${env.NEXT_PUBLIC_AUTH_URL}/login`);
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
                <span className="truncate font-semibold">{user.name}</span>

                <span className="truncate text-xs">{user.email}</span>
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

            <DropdownMenuItem asChild>
              <a href={`${env.NEXT_PUBLIC_AUTH_URL}/profile`}>
                <User />

                {t("app.userMenu.profile")}
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings />

              {t("app.userMenu.settings")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut}>
              <LogOut />

              {isSigningOut ? t("app.userMenu.signingOut") : t("app.userMenu.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
