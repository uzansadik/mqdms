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

import { removeBomLineAction } from "../actions";

type BomLineActionsProps = {
  /** Silinecek satır. */
  lineId: string;

  /** Satırın referans tanımı (onay metninde gösterilir). */
  referenceDesignation: string | null;

  /** Bileşen kodu (onay metninde gösterilir). */
  childItemCode: string | null;
};

/**
 * BOM satır eylemleri.
 *
 * Satır yalnızca düzenlenebilir bir revision üzerindeyen görünür: yayınlanmış
 * bir revision'ın içeriği doğrudan değiştirilemez.
 */
export function BomLineActions({
  lineId,
  referenceDesignation,
  childItemCode,
}: BomLineActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function remove() {
    startTransition(async () => {
      const result = await removeBomLineAction(lineId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("boms.lines.actions.removed"));

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button disabled={isPending} onClick={() => setIsOpen(true)} size="sm" variant="ghost">
        {t("boms.lines.actions.remove")}
      </Button>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("boms.lines.actions.remove")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("boms.lines.actions.remove.description")}
              {childItemCode ? ` (${childItemCode})` : ""}
              {referenceDesignation ? ` · ${referenceDesignation}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={remove}>
              {t("boms.lines.actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
