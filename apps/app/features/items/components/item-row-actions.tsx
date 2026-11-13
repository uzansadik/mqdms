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

import { archiveItemAction, restoreItemAction } from "../actions";

type ItemRowActionsProps = {
  itemId: string;
  archived: boolean;
};

/** Ürün satır eylemleri. */
export function ItemRowActions({ itemId, archived }: ItemRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function run(action: "archive" | "restore") {
    startTransition(async () => {
      const result =
        action === "archive" ? await archiveItemAction(itemId) : await restoreItemAction(itemId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "archive" ? t("items.actions.archived") : t("items.actions.restored"),
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
            <span className="sr-only">{t("items.list.columns.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/items/${itemId}/edit`}>{t("items.actions.edit")}</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsOpen(true)}
            variant={archived ? "default" : "destructive"}
          >
            {archived ? t("items.actions.restore") : t("items.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? t("items.actions.restore") : t("items.actions.archive")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {archived
                ? t("items.actions.restore.description")
                : t("items.actions.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              disabled={isPending}
              onClick={() => run(archived ? "restore" : "archive")}
            >
              {archived ? t("items.actions.restore") : t("items.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
