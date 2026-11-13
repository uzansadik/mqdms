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

import { removeProjectPlantAction } from "../actions";

type ProjectPlantActionsProps = {
  projectId: string;
  plantId: string;
};

/** Projeden tesis kaldırma. */
export function ProjectPlantActions({ projectId, plantId }: ProjectPlantActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function remove() {
    startTransition(async () => {
      const result = await removeProjectPlantAction(projectId, plantId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("projects.plants.remove"));

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button disabled={isPending} onClick={() => setIsOpen(true)} size="sm" variant="ghost">
        {t("projects.plants.remove")}
      </Button>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.plants.remove")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("projects.plants.empty.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={remove}>
              {t("projects.plants.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
