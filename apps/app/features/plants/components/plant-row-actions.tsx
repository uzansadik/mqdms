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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archivePlantAction, restorePlantAction } from "../actions";

type PlantRowActionsProps = {
  plantId: string;
  archived: boolean;
};

/** Tesis satır eylemleri. */
export function PlantRowActions({ plantId, archived }: PlantRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function run(action: "archive" | "restore") {
    startTransition(async () => {
      const result =
        action === "archive"
          ? await archivePlantAction(plantId)
          : await restorePlantAction(plantId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "archive" ? t("plants.actions.archived") : t("plants.actions.restored"),
      );

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost">
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">{t("plants.list.columns.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/plants/${plantId}/edit`}>{t("plants.actions.edit")}</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsOpen(true)}
            variant={archived ? "default" : "destructive"}
          >
            {archived ? t("plants.actions.restore") : t("plants.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? t("plants.actions.restore") : t("plants.actions.archive")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {archived
                ? t("plants.actions.restore.description")
                : t("plants.actions.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              disabled={isPending}
              onClick={() => run(archived ? "restore" : "archive")}
            >
              {archived ? t("plants.actions.restore") : t("plants.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
