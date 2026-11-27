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

import {
  createSpecialCharacteristicAction,
  deleteSpecialCharacteristicAction,
  updateSpecialCharacteristicAction,
} from "../actions";
import type { FmeaSpecialCharacteristicFormValues } from "../schema";

/** Özel karakteristik satırı. */
export type FmeaCharacteristicRow = {
  id: string;
  structureElementId: string | null;
  functionId: string | null;
  failureModeId: string | null;
  characteristicType: "PRODUCT" | "PROCESS";
  scClass: string | null;
  reason: string | null;
  status: "OPEN" | "IDENTIFIED" | "IMPLEMENTED" | "VERIFIED";
};

type FmeaSpecialCharacteristicPanelProps = {
  documentId: string;
  characteristics: FmeaCharacteristicRow[];
  structureElements: { id: string; label: string }[];
  failureModes: { id: string; label: string }[];
  editable: boolean;
};

/**
 * Özel karakteristik paneli.
 *
 * pE (ürün) ve pS (proses) özel karakteristikleri; gerekçe ve durum
 * takibiyle.
 */
export function FmeaSpecialCharacteristicPanel({
  documentId,
  characteristics,
  structureElements,
  failureModes,
  editable,
}: FmeaSpecialCharacteristicPanelProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [editing, setEditing] = useState<FmeaCharacteristicRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FmeaCharacteristicRow | null>(null);

  async function remove() {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteSpecialCharacteristicAction(pendingDelete.id);

    if (!result.success) {
      toast.error(result.error);

      return;
    }

    toast.success(t("common.delete"));
    setPendingDelete(null);
    router.refresh();
  }

  function targetLabel(characteristic: FmeaCharacteristicRow) {
    if (characteristic.structureElementId) {
      return (
        structureElements.find((entry) => entry.id === characteristic.structureElementId)?.label ??
        characteristic.structureElementId
      );
    }

    if (characteristic.failureModeId) {
      return (
        failureModes.find((entry) => entry.id === characteristic.failureModeId)?.label ??
        characteristic.failureModeId
      );
    }

    return characteristic.functionId ?? "-";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{t("fmea.tabs.characteristics")}</h2>

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

            {t("fmea.characteristics.add")}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fmea.characteristics.columns.target")}</TableHead>

              <TableHead>{t("fmea.characteristics.columns.type")}</TableHead>

              <TableHead>{t("fmea.characteristics.columns.class")}</TableHead>

              <TableHead>{t("fmea.characteristics.columns.reason")}</TableHead>

              <TableHead>{t("fmea.characteristics.columns.status")}</TableHead>

              {editable ? <TableHead /> : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {characteristics.map((characteristic) => (
              <TableRow key={characteristic.id}>
                <TableCell>{targetLabel(characteristic)}</TableCell>

                <TableCell>
                  <Badge variant="outline">
                    {t(`fmea.characteristics.type.${characteristic.characteristicType}`)}
                  </Badge>
                </TableCell>

                <TableCell>{characteristic.scClass ?? "-"}</TableCell>

                <TableCell className="max-w-sm">
                  <span className="line-clamp-2">{characteristic.reason ?? "-"}</span>
                </TableCell>

                <TableCell>
                  <Badge variant="outline">
                    {t(`fmea.characteristics.status.${characteristic.status}`)}
                  </Badge>
                </TableCell>

                {editable ? (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        aria-label={t("fmea.actions.edit")}
                        onClick={() => {
                          setEditing(characteristic);
                          setIsFormOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Pencil />
                      </Button>

                      <Button
                        aria-label={t("fmea.actions.delete")}
                        onClick={() => setPendingDelete(characteristic)}
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
            <DialogTitle>
              {editing ? t("fmea.actions.edit") : t("fmea.characteristics.add")}
            </DialogTitle>

            <DialogDescription>{t("fmea.description")}</DialogDescription>
          </DialogHeader>

          <FmeaCharacteristicForm
            characteristic={editing}
            documentId={documentId}
            failureModes={failureModes}
            onDone={() => {
              setIsFormOpen(false);
              setEditing(null);
              router.refresh();
            }}
            structureElements={structureElements}
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

            <AlertDialogDescription>{pendingDelete?.reason}</AlertDialogDescription>
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

/** Özel karakteristik formu. */
function FmeaCharacteristicForm({
  documentId,
  characteristic,
  structureElements,
  failureModes,
  onDone,
}: {
  documentId: string;
  characteristic: FmeaCharacteristicRow | null;
  structureElements: { id: string; label: string }[];
  failureModes: { id: string; label: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [structureElementId, setStructureElementId] = useState(
    characteristic?.structureElementId ?? "",
  );
  const [failureModeId, setFailureModeId] = useState(characteristic?.failureModeId ?? "");
  const [characteristicType, setCharacteristicType] = useState(
    characteristic?.characteristicType ?? "PROCESS",
  );
  const [scClass, setScClass] = useState(characteristic?.scClass ?? "");
  const [reason, setReason] = useState(characteristic?.reason ?? "");
  const [status, setStatus] = useState(characteristic?.status ?? "OPEN");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaSpecialCharacteristicFormValues = {
      structureElementId,
      functionId: characteristic?.functionId ?? "",
      failureModeId,
      characteristicType,
      scClass,
      reason,
      status,
    };

    const result = characteristic
      ? await updateSpecialCharacteristicAction(characteristic.id, payload)
      : await createSpecialCharacteristicAction(documentId, payload);

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
          <FieldLabel htmlFor="sc-element">{t("fmea.structure.title")}</FieldLabel>

          <NativeSelect
            id="sc-element"
            onChange={(event) => setStructureElementId(event.target.value)}
            value={structureElementId}
          >
            <NativeSelectOption value="">-</NativeSelectOption>

            {structureElements.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="sc-mode">{t("fmea.failures.columns.mode")}</FieldLabel>

          <NativeSelect
            id="sc-mode"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="sc-type">{t("fmea.characteristics.columns.type")}</FieldLabel>

            <NativeSelect
              id="sc-type"
              onChange={(event) =>
                setCharacteristicType(event.target.value as typeof characteristicType)
              }
              value={characteristicType}
            >
              <NativeSelectOption value="PROCESS">
                {t("fmea.characteristics.type.PROCESS")}
              </NativeSelectOption>

              <NativeSelectOption value="PRODUCT">
                {t("fmea.characteristics.type.PRODUCT")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="sc-class">{t("fmea.characteristics.columns.class")}</FieldLabel>

            <Input
              id="sc-class"
              onChange={(event) => setScClass(event.target.value)}
              value={scClass}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="sc-reason">{t("fmea.characteristics.columns.reason")}</FieldLabel>

          <Textarea
            id="sc-reason"
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            value={reason}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="sc-status">{t("fmea.characteristics.columns.status")}</FieldLabel>

          <NativeSelect
            id="sc-status"
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            <NativeSelectOption value="OPEN">
              {t("fmea.characteristics.status.OPEN")}
            </NativeSelectOption>

            <NativeSelectOption value="IDENTIFIED">
              {t("fmea.characteristics.status.IDENTIFIED")}
            </NativeSelectOption>

            <NativeSelectOption value="IMPLEMENTED">
              {t("fmea.characteristics.status.IMPLEMENTED")}
            </NativeSelectOption>

            <NativeSelectOption value="VERIFIED">
              {t("fmea.characteristics.status.VERIFIED")}
            </NativeSelectOption>
          </NativeSelect>
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
