"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { transitionFmeaDocumentAction } from "../actions";

type FmeaDocumentActionsProps = {
  documentId: string;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED";
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
};

/**
 * FMEA belgesi yaşam döngüsü eylemleri.
 *
 * Geçiş kuralları `lifecycle.ts` içinde tanımlıdır; burada yalnızca
 * geçerli eylemler gösterilir.
 */
export function FmeaDocumentActions({
  documentId,
  status,
  canSubmit,
  canApprove,
  canReject,
}: FmeaDocumentActionsProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  function transition(next: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED") {
    startTransition(async () => {
      const result = await transitionFmeaDocumentAction({ documentId, status: next });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(t("common.save"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && canSubmit ? (
        <Button disabled={isPending} onClick={() => transition("IN_REVIEW")}>
          {t("fmea.actions.submit")}
        </Button>
      ) : null}

      {status === "IN_REVIEW" && canApprove ? (
        <Button disabled={isPending} onClick={() => transition("APPROVED")}>
          {t("fmea.actions.approve")}
        </Button>
      ) : null}

      {status === "IN_REVIEW" && canReject ? (
        <Button disabled={isPending} onClick={() => transition("DRAFT")} variant="outline">
          {t("fmea.actions.reject")}
        </Button>
      ) : null}

      {status === "APPROVED" && canApprove ? (
        <Button disabled={isPending} onClick={() => transition("RELEASED")}>
          {t("fmea.actions.release")}
        </Button>
      ) : null}

      {status === "APPROVED" && canReject ? (
        <Button disabled={isPending} onClick={() => transition("DRAFT")} variant="outline">
          {t("fmea.actions.reject")}
        </Button>
      ) : null}
    </div>
  );
}
