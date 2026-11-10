"use client";

import { authClient } from "@mqdms/auth/client";
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
  AlertDialogTrigger,
} from "@mqdms/ui/components/alert-dialog";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelInvitationButtonProps = {
  invitationId: string;
  email: string;
};

export function CancelInvitationButton({ invitationId, email }: CancelInvitationButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    });

    if (error) {
      setError(error.message ?? t("organization.members.cancelError"));

      setIsPending(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending} size="sm" variant="outline">
            {t("organization.members.cancelInvitation")}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("organization.members.cancelInvitationTitle")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("organization.members.cancelInvitationDescription", { email })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("organization.members.keepInvitation")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={handleCancel}>
              {isPending
                ? t("organization.members.cancelling")
                : t("organization.members.cancelInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
