"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { releaseItemRevisionAction } from "../actions";

type ItemRevisionActionsProps = {
  revisionId: string;

  /** Revision yayınlandıysa eylem gösterilmez. */
  released: boolean;
};

/**
 * Item revision eylemleri.
 *
 * Yayınlanmış revision teknik içerik olarak değiştirilemez; yalnızca yeni
 * bir revision oluşturulabilir.
 */
export function ItemRevisionActions({ revisionId, released }: ItemRevisionActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  if (released) {
    return null;
  }

  function release() {
    startTransition(async () => {
      const result = await releaseItemRevisionAction(revisionId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("items.revisions.actions.released"));

      router.refresh();
    });
  }

  return (
    <Button disabled={isPending} onClick={release} size="sm" variant="outline">
      {t("items.revisions.actions.release")}
    </Button>
  );
}
