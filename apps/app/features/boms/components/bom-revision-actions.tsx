"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  type BomActionResult,
  createNextBomRevisionAction,
  releaseBomRevisionAction,
  returnBomToDraftAction,
  submitBomForReviewAction,
} from "../actions";

type BomRevisionActionsProps = {
  bomId: string;
  revisionId: string;
  status: "DRAFT" | "IN_REVIEW" | "RELEASED" | "SUPERSEDED";
  /** Başka bir açık taslak varsa yeni taslak oluşturulamaz. */
  hasOpenDraft: boolean;
  canSubmit: boolean;
  canRelease: boolean;
};

/**
 * Revision yaşam döngüsü eylemleri.
 *
 * Durum geçişleri açık aksiyonlarla yapılır: kullanıcı durum açılır
 * listesinden istediği statüye atlayamaz.
 */
export function BomRevisionActions({
  bomId,
  revisionId,
  status,
  hasOpenDraft,
  canSubmit,
  canRelease,
}: BomRevisionActionsProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<BomActionResult>) {
    setPending(true);

    const result = await action();

    setPending(false);

    if (!result.success) {
      toast.error(result.error);

      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" ? (
        <Button
          disabled={pending || !canSubmit}
          onClick={() => void run(() => submitBomForReviewAction(revisionId))}
          size="sm"
          variant="outline"
        >
          {t("boms.actions.submitForReview")}
        </Button>
      ) : null}

      {status === "IN_REVIEW" ? (
        <Button
          disabled={pending || !canSubmit}
          onClick={() => void run(() => returnBomToDraftAction(revisionId))}
          size="sm"
          variant="outline"
        >
          {t("boms.actions.returnToDraft")}
        </Button>
      ) : null}

      {status === "DRAFT" || status === "IN_REVIEW" ? (
        <Button
          disabled={pending || !canRelease}
          onClick={() => void run(() => releaseBomRevisionAction(revisionId))}
          size="sm"
        >
          {t("boms.actions.release")}
        </Button>
      ) : null}

      <Button
        disabled={pending || hasOpenDraft}
        onClick={() => void run(() => createNextBomRevisionAction({ bomId }))}
        size="sm"
        variant="outline"
      >
        {t("boms.actions.newRevision")}
      </Button>
    </div>
  );
}
