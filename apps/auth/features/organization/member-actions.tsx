"use client";

import { assignableRoleIds } from "@mqdms/auth/permissions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { MoreHorizontal, ShieldCheck, UserRound, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeMemberAction, updateMemberRoleAction } from "./actions";

type MemberActionsProps = {
  memberId: string;
  memberName: string;
  organizationId: string;
  role: string;
};

export function MemberActions({ memberId, memberName, organizationId, role }: MemberActionsProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [isPending, setIsPending] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRoles = role.split(",").map((item) => item.trim());

  const availableRoles = assignableRoleIds.filter((roleId) => !currentRoles.includes(roleId));

  async function updateRole(nextRole: string) {
    setIsPending(true);
    setError(null);

    const result = await updateMemberRoleAction({
      organizationId,
      memberId,
      role: nextRole,
    });

    if (!result.success) {
      setError(result.error);
      setIsPending(false);

      return;
    }

    router.refresh();
    setIsPending(false);
  }

  async function removeMember() {
    setIsPending(true);
    setError(null);

    const result = await removeMemberAction({
      organizationId,
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
            {availableRoles.length > 0 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ShieldCheck />
                  {t("organization.members.changeRole")}
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent>
                  {availableRoles.map((roleId) => (
                    <DropdownMenuItem key={roleId} onClick={() => updateRole(roleId)}>
                      <UserRound />
                      {t(`roles.${roleId}.label`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuLabel>{t("organization.members.allRolesAssigned")}</DropdownMenuLabel>
            )}

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
