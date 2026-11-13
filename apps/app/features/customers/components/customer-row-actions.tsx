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

import { archiveCustomerAction, restoreCustomerAction } from "../actions";

type CustomerRowActionsProps = {
  customerId: string;
  archived: boolean;
};

/**
 * Müşteri satır eylemleri.
 *
 * Arşivleme ve arşivden çıkarma onay ister: işlem geri alınabilir ama
 * müşteri listelerinde görünürlüğü değiştirir.
 */
export function CustomerRowActions({ customerId, archived }: CustomerRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function run(action: "archive" | "restore") {
    startTransition(async () => {
      const result =
        action === "archive"
          ? await archiveCustomerAction(customerId)
          : await restoreCustomerAction(customerId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "archive" ? t("customers.actions.archived") : t("customers.actions.restored"),
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
            <span className="sr-only">{t("customers.list.columns.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customerId}/edit`}>{t("customers.actions.edit")}</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsOpen(true)}
            variant={archived ? "default" : "destructive"}
          >
            {archived ? t("customers.actions.restore") : t("customers.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? t("customers.actions.restore") : t("customers.actions.archive")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {archived
                ? t("customers.actions.restore.description")
                : t("customers.actions.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              disabled={isPending}
              onClick={() => run(archived ? "restore" : "archive")}
            >
              {archived ? t("customers.actions.restore") : t("customers.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
