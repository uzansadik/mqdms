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
import { Textarea } from "@mqdms/ui/components/textarea";
import { TreeGrid, type TreeGridColumn } from "@mqdms/ui/components/tree-grid";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createFailureCauseAction,
  createFailureModeAction,
  deleteFailureCauseAction,
  deleteFailureModeAction,
  updateFailureCauseAction,
  updateFailureModeAction,
} from "../actions";
import type { FailureTreeRow } from "../failure-tree";
import { severityClassificationFor } from "../rating";
import type {
  FmeaCauseCategory,
  FmeaFailureCauseFormValues,
  FmeaFailureModeFormValues,
  FmeaSeverityClassification,
} from "../schema";

/** Seçim için seçenekler. */
export type FmeaFailureOption = {
  id: string;
  label: string;
};

type FmeaFailureGridProps = {
  documentId: string;
  rows: FailureTreeRow[];
  structureElements: FmeaFailureOption[];
  functions: FmeaFailureOption[];
  editable: boolean;
};

/**
 * Hata analizi çalışma sayfası.
 *
 * Satır grain'i **hata nedenidir**; element, fonksiyon ve hata modu
 * üst satırdan miras alınır. Action Priority, risk sınıfı ve özel aksiyon
 * kolonları **hesaplanır**.
 */
export function FmeaFailureGrid({
  documentId,
  rows,
  structureElements,
  functions,
  editable,
}: FmeaFailureGridProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [modeDialog, setModeDialog] = useState<{
    open: boolean;
    mode: FailureTreeRow | null;
    structureElementId: string;
  }>({ open: false, mode: null, structureElementId: "" });

  const [causeDialog, setCauseDialog] = useState<{
    open: boolean;
    cause: FailureTreeRow | null;
    failureModeId: string;
  }>({ open: false, cause: null, failureModeId: "" });

  const [pendingDelete, setPendingDelete] = useState<FailureTreeRow | null>(null);

  const tree = useMemo(() => buildTree(rows), [rows]);

  /**
   * Hata modu seçenekleri.
   *
   * Mod satırları ağacın içindedir; seçenek listesi düz satır listesinden
   * türetilir.
   */
  const modeOptions = useMemo(
    () =>
      rows
        .filter((row) => row.kind === "mode")
        .map((row) => ({ id: row.id, label: row.mode ?? row.id })),
    [rows],
  );

  const columns = useMemo<TreeGridColumn<FailureTreeRow>[]>(
    () => [
      { id: "element", header: t("fmea.failures.columns.element") },
      { id: "function", header: t("fmea.failures.columns.function") },
      { id: "mode", header: t("fmea.failures.columns.mode") },
      { id: "effectLocal", header: t("fmea.failures.columns.effectLocal") },
      { id: "effectEnd", header: t("fmea.failures.columns.effectEnd") },
      { id: "severity", header: t("fmea.failures.columns.severity") },
      { id: "classification", header: t("fmea.failures.columns.classification") },
      { id: "cause", header: t("fmea.failures.columns.cause") },
      { id: "causeCategory", header: t("fmea.failures.columns.causeCategory") },
      { id: "occurrence", header: t("fmea.failures.columns.occurrence") },
      { id: "prevention", header: t("fmea.failures.columns.prevention") },
      { id: "detectionControl", header: t("fmea.failures.columns.detectionControl") },
      { id: "detection", header: t("fmea.failures.columns.detection") },
      { id: "ap", header: t("fmea.failures.columns.actionPriority") },
      { id: "riskClass", header: t("fmea.failures.columns.riskClass") },
      { id: "specialAction", header: t("fmea.failures.columns.specialAction") },
      { id: "actions", header: t("fmea.failures.columns.actions") },
      { id: "rowActions", header: "" },
    ],
    [t],
  );

  const columnWidths = useMemo(
    () => ({
      element: "minmax(140px, 1fr)",
      function: "minmax(140px, 1fr)",
      mode: "minmax(180px, 1.4fr)",
      effectLocal: "minmax(160px, 1.2fr)",
      effectEnd: "minmax(160px, 1.2fr)",
      severity: "minmax(60px, 0.4fr)",
      classification: "minmax(80px, 0.5fr)",
      cause: "minmax(180px, 1.4fr)",
      causeCategory: "minmax(110px, 0.7fr)",
      occurrence: "minmax(60px, 0.4fr)",
      prevention: "minmax(160px, 1.2fr)",
      detectionControl: "minmax(160px, 1.2fr)",
      detection: "minmax(60px, 0.4fr)",
      ap: "minmax(90px, 0.6fr)",
      riskClass: "minmax(110px, 0.7fr)",
      specialAction: "minmax(110px, 0.7fr)",
      actions: "minmax(80px, 0.5fr)",
      rowActions: "minmax(110px, 0.7fr)",
    }),
    [],
  );

  const renderCell = useCallback(
    ({ row, columnId }: { row: FailureTreeRow; columnId: string }) => {
      switch (columnId) {
        case "element":
          return (
            <span className="font-medium">
              {row.elementCode} — {row.elementName}
            </span>
          );

        case "function":
          return row.functionName ?? <span className="text-muted-foreground">-</span>;

        case "mode":
          return row.mode ?? <span className="text-muted-foreground">-</span>;

        case "effectLocal":
          return row.effectLocal ?? <span className="text-muted-foreground">-</span>;

        case "effectEnd":
          return row.effectEnd ?? <span className="text-muted-foreground">-</span>;

        case "severity":
          return row.severity ?? <span className="text-muted-foreground">-</span>;

        case "classification":
          return row.classification ? (
            <Badge variant="outline">{t(`fmea.severityClass.${row.classification}`)}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );

        case "cause":
          return row.cause ?? <span className="text-muted-foreground">-</span>;

        case "causeCategory":
          return row.causeCategory ? (
            t(`fmea.causeCategory.${row.causeCategory}`)
          ) : (
            <span className="text-muted-foreground">-</span>
          );

        case "occurrence":
          return row.occurrence ?? <span className="text-muted-foreground">-</span>;

        case "prevention":
          return row.prevention ?? <span className="text-muted-foreground">-</span>;

        case "detectionControl":
          return row.detectionControl ?? <span className="text-muted-foreground">-</span>;

        case "detection":
          return row.detection ?? <span className="text-muted-foreground">-</span>;

        case "ap":
          return <ApBadge priority={row.actionPriority} />;

        case "riskClass":
          return <RiskBadge riskClass={row.riskClass} />;

        case "specialAction":
          return row.specialAction ? (
            <Badge variant="destructive">{t("fmea.failures.columns.specialAction")}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );

        case "actions":
          return row.actionCount > 0 ? (
            <Badge variant="secondary">{row.actionCount}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );

        case "rowActions": {
          if (!editable) {
            return null;
          }

          if (row.kind === "mode") {
            return (
              <Button
                aria-label={t("fmea.actions.edit")}
                onClick={() => setModeDialog({ open: true, mode: row, structureElementId: row.id })}
                size="icon"
                variant="ghost"
              >
                <Pencil />
              </Button>
            );
          }

          if (row.kind === "cause") {
            return (
              <div className="flex items-center gap-1">
                <Button
                  aria-label={t("fmea.actions.edit")}
                  onClick={() =>
                    setCauseDialog({ open: true, cause: row, failureModeId: row.parentId ?? "" })
                  }
                  size="icon"
                  variant="ghost"
                >
                  <Pencil />
                </Button>

                <Button
                  aria-label={t("fmea.actions.delete")}
                  onClick={() => setPendingDelete(row)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          }

          return null;
        }

        default:
          return null;
      }
    },
    [editable, t],
  );

  async function remove() {
    if (!pendingDelete) {
      return;
    }

    const result =
      pendingDelete.kind === "cause"
        ? await deleteFailureCauseAction(pendingDelete.id)
        : await deleteFailureModeAction(pendingDelete.id);

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
          <h2 className="text-lg font-medium">{t("fmea.failures.title")}</h2>

          <p className="text-sm text-muted-foreground">{t("fmea.description")}</p>
        </div>

        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setModeDialog({ open: true, mode: null, structureElementId: "" })}
              variant="outline"
            >
              <Plus />

              {t("fmea.failures.addMode")}
            </Button>

            <Button onClick={() => setCauseDialog({ open: true, cause: null, failureModeId: "" })}>
              <Plus />

              {t("fmea.failures.addCause")}
            </Button>
          </div>
        ) : null}
      </div>

      <TreeGrid
        className="h-[620px] rounded-md border"
        columnWidths={columnWidths}
        columns={columns}
        data={tree.roots}
        emptyMessage={t("fmea.documents.empty.description")}
        getChildren={(row) => tree.childrenOf.get(row.id) ?? []}
        getRowId={(row) => row.id}
        renderCell={renderCell}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setModeDialog({ open: false, mode: null, structureElementId: "" });
          }
        }}
        open={modeDialog.open}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modeDialog.mode ? t("fmea.actions.edit") : t("fmea.failures.addMode")}
            </DialogTitle>

            <DialogDescription>{t("fmea.failures.title")}</DialogDescription>
          </DialogHeader>

          <FmeaFailureModeForm
            documentId={documentId}
            functions={functions}
            mode={modeDialog.mode}
            onDone={() => {
              setModeDialog({ open: false, mode: null, structureElementId: "" });
              router.refresh();
            }}
            structureElements={structureElements}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCauseDialog({ open: false, cause: null, failureModeId: "" });
          }
        }}
        open={causeDialog.open}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {causeDialog.cause ? t("fmea.actions.edit") : t("fmea.failures.addCause")}
            </DialogTitle>

            <DialogDescription>{t("fmea.failures.title")}</DialogDescription>
          </DialogHeader>

          <FmeaFailureCauseForm
            cause={causeDialog.cause}
            documentId={documentId}
            failureModes={modeOptions}
            onDone={() => {
              setCauseDialog({ open: false, cause: null, failureModeId: "" });
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

            <AlertDialogDescription>
              {pendingDelete?.cause ?? pendingDelete?.mode}
            </AlertDialogDescription>
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

/** Action Priority rozeti. */
function ApBadge({ priority }: { priority: FailureTreeRow["actionPriority"] }) {
  const { t } = useI18n();

  if (!priority) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Badge
      variant={priority === "H" ? "destructive" : "outline"}
      className={
        priority === "M" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : undefined
      }
    >
      {t(`fmea.priority.${priority}`)}
    </Badge>
  );
}

/** Risk sınıfı rozeti. */
function RiskBadge({ riskClass }: { riskClass: FailureTreeRow["riskClass"] }) {
  const { t } = useI18n();

  if (!riskClass) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Badge
      variant="outline"
      className={
        riskClass === "A"
          ? "border-red-500 text-red-700 dark:text-red-400"
          : riskClass === "B"
            ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
            : undefined
      }
    >
      {t(`fmea.risk.${riskClass}`)}
    </Badge>
  );
}

/** Hata modu formu. */
function FmeaFailureModeForm({
  documentId,
  mode,
  structureElements,
  functions,
  onDone,
}: {
  documentId: string;
  mode: FailureTreeRow | null;
  structureElements: FmeaFailureOption[];
  functions: FmeaFailureOption[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [structureElementId, setStructureElementId] = useState(mode?.elementId ?? "");
  const [functionId, setFunctionId] = useState("");
  const [failureMode, setFailureMode] = useState(mode?.mode ?? "");
  const [failureEffectLocal, setFailureEffectLocal] = useState(mode?.effectLocal ?? "");
  const [failureEffectEnd, setFailureEffectEnd] = useState(mode?.effectEnd ?? "");
  const [severity, setSeverity] = useState(mode?.severity ?? 1);
  const [classification, setClassification] = useState<FmeaSeverityClassification>(
    (mode?.classification as FmeaSeverityClassification | undefined) ?? "NONE",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaFailureModeFormValues = {
      structureElementId,
      functionId,
      failureMode,
      failureEffectLocal,
      failureEffectEnd,
      severity,
      severityClassification: classification,
    };

    const result = mode
      ? await updateFailureModeAction(mode.id, payload)
      : await createFailureModeAction(documentId, payload);

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
          <FieldLabel htmlFor="mode-element">{t("fmea.failures.columns.element")}</FieldLabel>

          <NativeSelect
            id="mode-element"
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
          <FieldLabel htmlFor="mode-function">{t("fmea.failures.columns.function")}</FieldLabel>

          <NativeSelect
            id="mode-function"
            onChange={(event) => setFunctionId(event.target.value)}
            value={functionId}
          >
            <NativeSelectOption value="">-</NativeSelectOption>

            {functions.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="mode-title">{t("fmea.failures.columns.mode")}</FieldLabel>

          <Input
            id="mode-title"
            onChange={(event) => setFailureMode(event.target.value)}
            value={failureMode}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="mode-effect-local">
            {t("fmea.failures.columns.effectLocal")}
          </FieldLabel>

          <Textarea
            id="mode-effect-local"
            onChange={(event) => setFailureEffectLocal(event.target.value)}
            rows={2}
            value={failureEffectLocal}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="mode-effect-end">{t("fmea.failures.columns.effectEnd")}</FieldLabel>

          <Textarea
            id="mode-effect-end"
            onChange={(event) => setFailureEffectEnd(event.target.value)}
            rows={2}
            value={failureEffectEnd}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="mode-severity">{t("fmea.rating.severity")}</FieldLabel>

            <NativeSelect
              id="mode-severity"
              onChange={(event) => {
                const value = Number(event.target.value);

                setSeverity(value);
                setClassification(severityClassificationFor(value as never));
              }}
              value={String(severity)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="mode-classification">
              {t("fmea.failures.columns.classification")}
            </FieldLabel>

            <NativeSelect
              id="mode-classification"
              onChange={(event) =>
                setClassification(event.target.value as FmeaSeverityClassification)
              }
              value={classification}
            >
              <NativeSelectOption value="NONE">{t("fmea.severityClass.NONE")}</NativeSelectOption>

              <NativeSelectOption value="SC1">{t("fmea.severityClass.SC1")}</NativeSelectOption>

              <NativeSelectOption value="SC2">{t("fmea.severityClass.SC2")}</NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>

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

/** Hata nedeni formu. */
function FmeaFailureCauseForm({
  documentId,
  cause,
  failureModes,
  onDone,
}: {
  documentId: string;
  cause: FailureTreeRow | null;
  failureModes: { id: string; label: string }[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [failureModeId, setFailureModeId] = useState(cause?.parentId ?? "");
  const [text, setText] = useState(cause?.cause ?? "");
  const [causeCategory, setCauseCategory] = useState<FmeaCauseCategory>(
    (cause?.causeCategory as FmeaCauseCategory | undefined) ?? "OTHER",
  );
  const [occurrence, setOccurrence] = useState(cause?.occurrence ?? 1);
  const [detection, setDetection] = useState(cause?.detection ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const modeOptions = failureModes;

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaFailureCauseFormValues = {
      failureModeId,
      cause: text,
      causeCategory,
      processWorkElementId: "",
      processFunctionId: "",
      occurrence,
      detection,
    };

    const result = cause
      ? await updateFailureCauseAction(cause.id, payload)
      : await createFailureCauseAction(documentId, payload);

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
          <FieldLabel htmlFor="cause-mode">{t("fmea.failures.columns.mode")}</FieldLabel>

          <NativeSelect
            id="cause-mode"
            onChange={(event) => setFailureModeId(event.target.value)}
            value={failureModeId}
          >
            <NativeSelectOption value="">-</NativeSelectOption>

            {modeOptions.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="cause-text">{t("fmea.failures.columns.cause")}</FieldLabel>

          <Input id="cause-text" onChange={(event) => setText(event.target.value)} value={text} />
        </Field>

        <Field>
          <FieldLabel htmlFor="cause-category">
            {t("fmea.failures.columns.causeCategory")}
          </FieldLabel>

          <NativeSelect
            id="cause-category"
            onChange={(event) => setCauseCategory(event.target.value as FmeaCauseCategory)}
            value={causeCategory}
          >
            {(
              [
                "MAN",
                "MACHINE",
                "MATERIAL",
                "ENVIRONMENT",
                "METHOD",
                "MEASUREMENT",
                "OTHER",
              ] as const
            ).map((value) => (
              <NativeSelectOption key={value} value={value}>
                {t(`fmea.causeCategory.${value}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cause-occurrence">{t("fmea.rating.occurrence")}</FieldLabel>

            <NativeSelect
              id="cause-occurrence"
              onChange={(event) => setOccurrence(Number(event.target.value))}
              value={String(occurrence)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="cause-detection">{t("fmea.rating.detection")}</FieldLabel>

            <NativeSelect
              id="cause-detection"
              onChange={(event) => setDetection(Number(event.target.value))}
              value={String(detection)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

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

/** Düz satırlardan ağaç kurar. */
function buildTree(rows: FailureTreeRow[]): {
  roots: FailureTreeRow[];
  childrenOf: Map<string, FailureTreeRow[]>;
} {
  const childrenOf = new Map<string, FailureTreeRow[]>();
  const roots: FailureTreeRow[] = [];

  for (const row of rows) {
    if (!row.parentId) {
      roots.push(row);

      continue;
    }

    const list = childrenOf.get(row.parentId) ?? [];

    list.push(row);
    childrenOf.set(row.parentId, list);
  }

  return { roots, childrenOf };
}
