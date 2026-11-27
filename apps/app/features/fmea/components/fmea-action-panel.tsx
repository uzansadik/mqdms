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
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mqdms/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import { Textarea } from "@mqdms/ui/components/textarea";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createActionAction, deleteActionAction, updateActionAction } from "../actions";
import type { FmeaActionFormValues } from "../schema";

/** Aksiyon satırı. */
export type FmeaActionRow = {
  id: string;
  failureModeId: string | null;
  failureCauseId: string | null;
  actionType: "PREVENT" | "DETECT" | "IMPROVE";
  description: string;
  responsibleText: string | null;
  targetDate: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  verificationOfEffectiveness: string | null;
  isSpecialAction: boolean;
};

type FmeaActionPanelProps = {
  documentId: string;
  actions: FmeaActionRow[];
  /** Hata modu seçenekleri. */
  failureModes: { id: string; label: string }[];
  editable: boolean;
};

/**
 * Aksiyon paneli.
 *
 * AIAG–VDA adım 6 ("optimizasyon") çıktısıdır: aksiyon, sorumlu, termin ve
 * etkinlik doğrulaması.
 */
export function FmeaActionPanel({
  documentId,
  actions,
  failureModes,
  editable,
}: FmeaActionPanelProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [editing, setEditing] = useState<FmeaActionRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FmeaActionRow | null>(null);

  async function remove() {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteActionAction(pendingDelete.id);

    if (!result.success) {
      toast.error(result.error);

      return;
    }

    toast.success(t("common.delete"));
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{t("fmea.tabs.actions")}</h2>

          <p className="text-sm text-muted-foreground">{t("fmea.description")}</p>
        </div>

        {editable ? (
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus />

            {t("fmea.actionList.add")}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fmea.actionList.columns.description")}</TableHead>

              <TableHead>{t("fmea.actionList.columns.type")}</TableHead>

              <TableHead>{t("fmea.actionList.columns.responsible")}</TableHead>

              <TableHead>{t("fmea.actionList.columns.targetDate")}</TableHead>

              <TableHead>{t("fmea.actionList.columns.status")}</TableHead>

              <TableHead>{t("fmea.actionList.columns.verification")}</TableHead>

              {editable ? <TableHead /> : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell className="max-w-sm">
                  <span className="line-clamp-2">{action.description}</span>

                  {action.isSpecialAction ? (
                    <Badge className="mt-1" variant="destructive">
                      {t("fmea.failures.columns.specialAction")}
                    </Badge>
                  ) : null}
                </TableCell>

                <TableCell>{t(`fmea.actionList.type.${action.actionType}`)}</TableCell>

                <TableCell>{action.responsibleText ?? "-"}</TableCell>

                <TableCell>{action.targetDate ?? "-"}</TableCell>

                <TableCell>
                  <Badge variant="outline">{t(`fmea.actionList.status.${action.status}`)}</Badge>
                </TableCell>

                <TableCell className="max-w-xs">
                  <span className="line-clamp-2">{action.verificationOfEffectiveness ?? "-"}</span>
                </TableCell>

                {editable ? (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        aria-label={t("fmea.actions.edit")}
                        onClick={() => {
                          setEditing(action);
                          setIsFormOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Pencil />
                      </Button>

                      <Button
                        aria-label={t("fmea.actions.delete")}
                        onClick={() => setPendingDelete(action)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog onOpenChange={setIsFormOpen} open={isFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("fmea.actions.edit") : t("fmea.actionList.add")}</DialogTitle>

            <DialogDescription>{t("fmea.description")}</DialogDescription>
          </DialogHeader>

          <FmeaActionForm
            action={editing}
            documentId={documentId}
            failureModes={failureModes}
            onDone={() => {
              setIsFormOpen(false);
              setEditing(null);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={Boolean(pendingDelete)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("fmea.actions.delete")}</AlertDialogTitle>

            <AlertDialogDescription>{pendingDelete?.description}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction onClick={() => void remove()} variant="destructive">
              {t("fmea.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Aksiyon formu. */
function FmeaActionForm({
  documentId,
  action,
  failureModes,
  onDone,
}: {
  documentId: string;
  action: FmeaActionRow | null;
  failureModes: { id: string; label: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [failureModeId, setFailureModeId] = useState(action?.failureModeId ?? "");
  const [actionType, setActionType] = useState(action?.actionType ?? "IMPROVE");
  const [description, setDescription] = useState(action?.description ?? "");
  const [responsibleText, setResponsibleText] = useState(action?.responsibleText ?? "");
  const [targetDate, setTargetDate] = useState(action?.targetDate ?? "");
  const [status, setStatus] = useState(action?.status ?? "OPEN");
  const [verification, setVerification] = useState(action?.verificationOfEffectiveness ?? "");
  const [isSpecialAction, setIsSpecialAction] = useState(action?.isSpecialAction ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaActionFormValues = {
      failureModeId,
      failureCauseId: action?.failureCauseId ?? "",
      actionType,
      description,
      responsibleId: "",
      responsibleText,
      targetDate,
      status,
      verificationOfEffectiveness: verification,
      isSpecialAction,
    };

    const result = action
      ? await updateActionAction(action.id, payload)
      : await createActionAction(documentId, payload);

    setIsPending(false);

    if (!result.success) {
      setError(result.error);

      return;
    }

    toast.success(t("common.save"));
    onDone();
  }

  return (
    <div className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="action-mode">{t("fmea.failures.columns.mode")}</FieldLabel>

          <NativeSelect
            id="action-mode"
            onChange={(event) => setFailureModeId(event.target.value)}
            value={failureModeId}
          >
            <NativeSelectOption value="">-</NativeSelectOption>

            {failureModes.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="action-type">{t("fmea.actionList.columns.type")}</FieldLabel>

          <NativeSelect
            id="action-type"
            onChange={(event) => setActionType(event.target.value as typeof actionType)}
            value={actionType}
          >
            <NativeSelectOption value="PREVENT">
              {t("fmea.actionList.type.PREVENT")}
            </NativeSelectOption>

            <NativeSelectOption value="DETECT">
              {t("fmea.actionList.type.DETECT")}
            </NativeSelectOption>

            <NativeSelectOption value="IMPROVE">
              {t("fmea.actionList.type.IMPROVE")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="action-description">
            {t("fmea.actionList.columns.description")}
          </FieldLabel>

          <Textarea
            id="action-description"
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            value={description}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="action-responsible">
              {t("fmea.actionList.columns.responsible")}
            </FieldLabel>

            <Input
              id="action-responsible"
              onChange={(event) => setResponsibleText(event.target.value)}
              value={responsibleText}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="action-date">{t("fmea.actionList.columns.targetDate")}</FieldLabel>

            <Input
              id="action-date"
              onChange={(event) => setTargetDate(event.target.value)}
              type="date"
              value={targetDate}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="action-status">{t("fmea.actionList.columns.status")}</FieldLabel>

            <NativeSelect
              id="action-status"
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              <NativeSelectOption value="OPEN">
                {t("fmea.actionList.status.OPEN")}
              </NativeSelectOption>

              <NativeSelectOption value="IN_PROGRESS">
                {t("fmea.actionList.status.IN_PROGRESS")}
              </NativeSelectOption>

              <NativeSelectOption value="DONE">
                {t("fmea.actionList.status.DONE")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="action-special">
              {t("fmea.failures.columns.specialAction")}
            </FieldLabel>

            <NativeSelect
              id="action-special"
              onChange={(event) => setIsSpecialAction(event.target.value === "true")}
              value={isSpecialAction ? "true" : "false"}
            >
              <NativeSelectOption value="false">{t("common.no")}</NativeSelectOption>

              <NativeSelectOption value="true">{t("common.yes")}</NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="action-verification">
            {t("fmea.actionList.columns.verification")}
          </FieldLabel>

          <Textarea
            id="action-verification"
            onChange={(event) => setVerification(event.target.value)}
            rows={2}
            value={verification}
          />
        </Field>

        {error ? <FieldError errors={[{ message: error }]} /> : null}
      </FieldGroup>

      <DialogFooter>
        <Button disabled={isPending} onClick={() => void submit()}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
