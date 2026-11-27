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

import { createFunctionAction, deleteFunctionAction, updateFunctionAction } from "../actions";
import type { FmeaFunctionAspect, FmeaFunctionFormValues } from "../schema";

/** Fonksiyon satırı. */
export type FmeaFunctionRow = {
  id: string;
  structureElementId: string | null;
  name: string;
  description: string | null;
  functionAspect: "PURPOSE" | "INPUT" | "OUTPUT" | "CONTROL";
  requirementText: string | null;
  isSpecialCharacteristic: boolean;
};

type FmeaFunctionPanelProps = {
  documentId: string;
  functions: FmeaFunctionRow[];
  structureElements: { id: string; label: string }[];
  editable: boolean;
};

/**
 * Fonksiyon analizi paneli.
 *
 * AIAG–VDA adım 3 ("fonksiyon analizi") çıktısıdır.
 */
export function FmeaFunctionPanel({
  documentId,
  functions,
  structureElements,
  editable,
}: FmeaFunctionPanelProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [editing, setEditing] = useState<FmeaFunctionRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FmeaFunctionRow | null>(null);

  async function remove() {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteFunctionAction(pendingDelete.id);

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
          <h2 className="text-lg font-medium">{t("fmea.functions.title")}</h2>

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

            {t("fmea.functions.add")}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fmea.functions.columns.element")}</TableHead>

              <TableHead>{t("fmea.functions.columns.name")}</TableHead>

              <TableHead>{t("fmea.functions.columns.aspect")}</TableHead>

              <TableHead>{t("fmea.functions.columns.requirement")}</TableHead>

              {editable ? <TableHead /> : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {functions.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {structureElements.find((option) => option.id === entry.structureElementId)
                    ?.label ?? "-"}
                </TableCell>

                <TableCell>
                  <span className="font-medium">{entry.name}</span>

                  {entry.isSpecialCharacteristic ? (
                    <Badge className="ml-2" variant="secondary">
                      {t("fmea.structure.columns.special")}
                    </Badge>
                  ) : null}
                </TableCell>

                <TableCell>{t(`fmea.functionAspect.${entry.functionAspect}`)}</TableCell>

                <TableCell className="max-w-sm">
                  <span className="line-clamp-2">{entry.requirementText ?? "-"}</span>
                </TableCell>

                {editable ? (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        aria-label={t("fmea.actions.edit")}
                        onClick={() => {
                          setEditing(entry);
                          setIsFormOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Pencil />
                      </Button>

                      <Button
                        aria-label={t("fmea.actions.delete")}
                        onClick={() => setPendingDelete(entry)}
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
            <DialogTitle>{editing ? t("fmea.actions.edit") : t("fmea.functions.add")}</DialogTitle>

            <DialogDescription>{t("fmea.functions.title")}</DialogDescription>
          </DialogHeader>

          <FmeaFunctionForm
            documentId={documentId}
            entry={editing}
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

            <AlertDialogDescription>{pendingDelete?.name}</AlertDialogDescription>
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

/** Fonksiyon formu. */
function FmeaFunctionForm({
  documentId,
  entry,
  structureElements,
  onDone,
}: {
  documentId: string;
  entry: FmeaFunctionRow | null;
  structureElements: { id: string; label: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [structureElementId, setStructureElementId] = useState(entry?.structureElementId ?? "");
  const [name, setName] = useState(entry?.name ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [functionAspect, setFunctionAspect] = useState<FmeaFunctionAspect>(
    entry?.functionAspect ?? "PURPOSE",
  );
  const [requirementText, setRequirementText] = useState(entry?.requirementText ?? "");
  const [isSpecialCharacteristic, setIsSpecialCharacteristic] = useState(
    entry?.isSpecialCharacteristic ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaFunctionFormValues = {
      structureElementId,
      processFunctionId: "",
      name,
      description,
      functionAspect,
      requirementText,
      isSpecialCharacteristic,
    };

    const result = entry
      ? await updateFunctionAction(entry.id, payload)
      : await createFunctionAction(documentId, payload);

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
          <FieldLabel htmlFor="function-element">{t("fmea.functions.columns.element")}</FieldLabel>

          <NativeSelect
            id="function-element"
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
          <FieldLabel htmlFor="function-name">{t("fmea.functions.columns.name")}</FieldLabel>

          <Input
            id="function-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="function-aspect">{t("fmea.functions.columns.aspect")}</FieldLabel>

          <NativeSelect
            id="function-aspect"
            onChange={(event) => setFunctionAspect(event.target.value as FmeaFunctionAspect)}
            value={functionAspect}
          >
            {(["PURPOSE", "INPUT", "OUTPUT", "CONTROL"] as const).map((value) => (
              <NativeSelectOption key={value} value={value}>
                {t(`fmea.functionAspect.${value}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="function-description">{t("fmea.form.description.label")}</FieldLabel>

          <Textarea
            id="function-description"
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            value={description}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="function-requirement">
            {t("fmea.functions.columns.requirement")}
          </FieldLabel>

          <Textarea
            id="function-requirement"
            onChange={(event) => setRequirementText(event.target.value)}
            rows={2}
            value={requirementText}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="function-special">{t("fmea.structure.columns.special")}</FieldLabel>

          <NativeSelect
            id="function-special"
            onChange={(event) => setIsSpecialCharacteristic(event.target.value === "true")}
            value={isSpecialCharacteristic ? "true" : "false"}
          >
            <NativeSelectOption value="false">{t("common.no")}</NativeSelectOption>

            <NativeSelectOption value="true">{t("common.yes")}</NativeSelectOption>
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
