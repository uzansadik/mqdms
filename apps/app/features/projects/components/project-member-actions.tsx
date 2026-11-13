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
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { removeProjectMemberAction } from "../actions";

type ProjectMemberActionsProps = {
  projectId: string;
  memberId: string;
};

/**
 * Proje ekibinden üye çıkarma.
 *
 * İlişki soft-remove edilir: geçmiş korunur ve üye yeniden eklenebilir.
 */
export function ProjectMemberActions({ projectId, memberId }: ProjectMemberActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function remove() {
    startTransition(async () => {
      const result = await removeProjectMemberAction(projectId, memberId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("projects.team.remove"));

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button disabled={isPending} onClick={() => setIsOpen(true)} size="sm" variant="ghost">
        {t("projects.team.remove")}
      </Button>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.team.remove")}</AlertDialogTitle>

            <AlertDialogDescription>{t("projects.team.empty.description")}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={remove}>
              {t("projects.team.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
