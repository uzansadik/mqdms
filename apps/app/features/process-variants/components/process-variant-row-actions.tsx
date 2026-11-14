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

import { archiveProcessVariantAction, restoreProcessVariantAction } from "../actions";

type ProcessVariantRowActionsProps = {
  variantId: string;
  processId: string;
  archived: boolean;
};

/** Process Variant satır eylemleri. */
export function ProcessVariantRowActions({
  variantId,
  processId,
  archived,
}: ProcessVariantRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function run(action: "archive" | "restore") {
    startTransition(async () => {
      const result =
        action === "archive"
          ? await archiveProcessVariantAction(variantId)
          : await restoreProcessVariantAction(variantId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "archive"
          ? t("processVariants.actions.archived")
          : t("processVariants.actions.restored"),
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
            <span className="sr-only">{t("processes.detail.variants.columns.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/master-processes/${processId}/variants/${variantId}`}>
              {t("processVariants.actions.open")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/master-processes/${processId}/variants/${variantId}/edit`}>
              {t("processVariants.actions.edit")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsOpen(true)}
            variant={archived ? "default" : "destructive"}
          >
            {archived ? t("processVariants.actions.restore") : t("processVariants.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived
                ? t("processVariants.actions.restore")
                : t("processVariants.actions.archive")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {archived
                ? t("processVariants.actions.restore.description")
                : t("processVariants.actions.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              disabled={isPending}
              onClick={() => run(archived ? "restore" : "archive")}
            >
              {archived
                ? t("processVariants.actions.restore")
                : t("processVariants.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
