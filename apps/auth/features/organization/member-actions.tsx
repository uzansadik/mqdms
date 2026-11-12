"use client";

import { useI18n } from "@mqdms/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@mqdms/ui/components/alert-dialog";
import { Button } from "@mqdms/ui/components/button";
import { Checkbox } from "@mqdms/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { MoreHorizontal, ShieldCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { assignMemberRolesAction, removeMemberAction } from "./actions";

type MemberActionsProps = {
  memberId: string;
  memberName: string;

  /** Üyeye atanmış fonksiyonel rollerin id'leri. */
  roleIds: string[];

  /** Organizasyondaki seçilebilir roller. */
  roles: {
    id: string;
    name: string;
  }[];
};

export function MemberActions({ memberId, memberName, roleIds, roles }: MemberActionsProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [isPending, setIsPending] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateRoles(nextRoleIds: string[]) {
    setIsPending(true);
    setError(null);

    const result = await assignMemberRolesAction({
      memberId,
      roleIds: nextRoleIds,
    });

    if (!result.success) {
      setError(result.error);
      setIsPending(false);

      return;
    }

    setRolesOpen(false);

    router.refresh();
    setIsPending(false);
  }

  async function removeMember() {
    setIsPending(true);
    setError(null);

    const result = await removeMemberAction({
      memberId,
    });

    if (!result.success) {
      setError(result.error);
      setIsPending(false);

      return;
    }

    setRemoveOpen(false);

    router.refresh();
    setIsPending(false);
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isPending} size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />

              <span className="sr-only">{t("organization.members.actions")}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRolesOpen(true)}>
              <ShieldCheck />
              {t("organization.members.changeRole")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setRemoveOpen(true)}
            >
              <UserX />
              {t("organization.members.remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
      </div>

      <AlertDialog onOpenChange={setRolesOpen} open={rolesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("organization.members.changeRoleTitle", { name: memberName })}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {t("organization.members.changeRoleDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2 sm:grid-cols-2">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("organization.roles.empty.description")}
              </p>
            ) : (
              roles.map((role) => (
                <div className="flex items-center gap-2 text-sm" key={role.id}>
                  <Checkbox
                    checked={roleIds.includes(role.id)}
                    disabled={isPending}
                    onCheckedChange={(value) => {
                      void updateRoles(
                        value === true
                          ? [...roleIds, role.id]
                          : roleIds.filter((item) => item !== role.id),
                      );
                    }}
                  />

                  <span>{role.name}</span>
                </div>
              ))
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("organization.members.removeTitle", { name: memberName })}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {t("organization.members.removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={removeMember}>
              {isPending
                ? t("organization.members.removing")
                : t("organization.members.removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
