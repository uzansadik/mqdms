"use client";

import { Button } from "@mqdms/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { Ban, MoreHorizontal, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { setUserBanAction, setUserRoleAction } from "../actions";

type UserRowActionsProps = {
  userId: string;
  role: string | null;
  banned: boolean | null;
};

export function UserRowActions({ userId, role, banned }: UserRowActionsProps) {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperadmin = role === "superadmin";
  const isBanned = banned ?? false;

  async function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setPending(true);
    setError(null);

    const result = await action();

    if (!result.success) {
      setError(result.error ?? "The operation failed.");

      setPending(false);

      return;
    }

    setPending(false);

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={pending} size="icon" variant="ghost">
            <MoreHorizontal className="size-4" />

            <span className="sr-only">User actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Platform role</DropdownMenuLabel>

          <DropdownMenuItem
            disabled={pending || isSuperadmin}
            onClick={() => run(() => setUserRoleAction({ userId, role: "superadmin" }))}
          >
            <ShieldCheck />
            Make superadmin
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={pending || !isSuperadmin}
            onClick={() => run(() => setUserRoleAction({ userId, role: "user" }))}
          >
            <UserRound />
            Make user
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={pending}
            onClick={() =>
              run(() =>
                setUserBanAction({
                  userId,
                  banned: !isBanned,
                  banReason: isBanned ? undefined : "Banned by a superadmin",
                }),
              )
            }
          >
            <Ban />
            {isBanned ? "Unban user" : "Ban user"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
