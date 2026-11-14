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
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveProcessVariantRevisionAction,
  rejectProcessVariantRevisionAction,
  releaseProcessVariantRevisionAction,
  submitProcessVariantRevisionAction,
} from "../actions";

type RevisionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";

type ProcessVariantRevisionActionsProps = {
  /** Revision id'si. */
  revisionId: string;

  /** Revision'ın durumu. */
  status: RevisionStatus;

  /** Kullanıcının gönderme izni var mı? */
  canSubmit: boolean;

  /** Kullanıcının onaylama izni var mı? */
  canApprove: boolean;

  /** Kullanıcının yayınlama izni var mı? */
  canRelease: boolean;

  /** Kullanıcının geri alma izni var mı? */
  canReject: boolean;
};

/**
 * Revision yaşam döngüsü eylemleri.
 *
 * Geçişler servis tarafında doğrulanır; arayüz yalnızca geçerli olabilecek
 * eylemleri gösterir.
 */
export function ProcessVariantRevisionActions({
  revisionId,
  status,
  canSubmit,
  canApprove,
  canRelease,
  canReject,
}: ProcessVariantRevisionActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  function run(action: "submit" | "approve" | "release") {
    startTransition(async () => {
      const result =
        action === "submit"
          ? await submitProcessVariantRevisionAction(revisionId)
          : action === "approve"
            ? await approveProcessVariantRevisionAction(revisionId)
            : await releaseProcessVariantRevisionAction(revisionId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const messages = {
        submit: "processVariants.revisions.actions.submitted",
        approve: "processVariants.revisions.actions.approved",
        release: "processVariants.revisions.actions.released",
      } as const;

      toast.success(t(messages[action]));

      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectProcessVariantRevisionAction(revisionId, { reason });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("processVariants.revisions.actions.rejected"));

      setIsRejectOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && canSubmit && (
          <Button disabled={isPending} onClick={() => run("submit")} type="button">
            {t("processVariants.revisions.actions.submit")}
          </Button>
        )}

        {status === "IN_REVIEW" && canApprove && (
          <Button disabled={isPending} onClick={() => run("approve")} type="button">
            {t("processVariants.revisions.actions.approve")}
          </Button>
        )}

        {status === "APPROVED" && canRelease && (
          <Button disabled={isPending} onClick={() => run("release")} type="button">
            {t("processVariants.revisions.actions.release")}
          </Button>
        )}

        {(status === "IN_REVIEW" || status === "APPROVED") && canReject && (
          <Button
            disabled={isPending}
            onClick={() => setIsRejectOpen(true)}
            type="button"
            variant="outline"
          >
            {t("processVariants.revisions.actions.reject")}
          </Button>
        )}
      </div>

      <AlertDialog onOpenChange={setIsRejectOpen} open={isRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("processVariants.revisions.actions.reject")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("processVariants.revisions.actions.reject.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field>
            <FieldLabel htmlFor="reject-reason">
              {t("processVariants.revisions.actions.reject.reason")}
            </FieldLabel>

            <Textarea
              id="reject-reason"
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              value={reason}
            />
          </Field>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending || reason.trim() === ""} onClick={reject}>
              {t("processVariants.revisions.actions.reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
