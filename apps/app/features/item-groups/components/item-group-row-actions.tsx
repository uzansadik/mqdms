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

import { archiveItemGroupAction, restoreItemGroupAction } from "../actions";

type ItemGroupRowActionsProps = {
  groupId: string;
  archived: boolean;
};

/** Ürün grubu satır eylemleri. */
export function ItemGroupRowActions({ groupId, archived }: ItemGroupRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function run(action: "archive" | "restore") {
    startTransition(async () => {
      const result =
        action === "archive"
          ? await archiveItemGroupAction(groupId)
          : await restoreItemGroupAction(groupId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "archive" ? t("itemGroups.actions.archived") : t("itemGroups.actions.restored"),
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
            <span className="sr-only">{t("itemGroups.list.columns.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/item-groups/${groupId}/edit`}>{t("itemGroups.actions.edit")}</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsOpen(true)}
            variant={archived ? "default" : "destructive"}
          >
            {archived ? t("itemGroups.actions.restore") : t("itemGroups.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? t("itemGroups.actions.restore") : t("itemGroups.actions.archive")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {archived
                ? t("itemGroups.actions.restore.description")
                : t("itemGroups.actions.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              disabled={isPending}
              onClick={() => run(archived ? "restore" : "archive")}
            >
              {archived ? t("itemGroups.actions.restore") : t("itemGroups.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
