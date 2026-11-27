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
  createStructureElementAction,
  deleteStructureElementAction,
  importStructureFromSourceAction,
  updateStructureElementAction,
} from "../actions";
import type { FmeaStructureElementFormValues } from "../schema";

/** Yapı elemanı satırı. */
export type FmeaStructureRow = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  level: "SYSTEM" | "SUBSYSTEM" | "COMPONENT";
  isSpecialCharacteristic: boolean;
  flowNodeId: string | null;
  itemId: string | null;
};

type FmeaStructurePanelProps = {
  documentId: string;
  fmeaType: "PFMEA" | "DFMEA" | "SFMEA";
  elements: FmeaStructureRow[];
  editable: boolean;
};

/**
 * Yapı analizi paneli.
 *
 * Yapı ağacı AIAG–VDA adım 2'nin çıktısıdır. Ağaç `TreeGrid` ile gösterilir;
 * satırlar formlar üzerinden düzenlenir.
 */
export function FmeaStructurePanel({
  documentId,
  fmeaType,
  elements,
  editable,
}: FmeaStructurePanelProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [editing, setEditing] = useState<FmeaStructureRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FmeaStructureRow | null>(null);

  const tree = useMemo(() => buildTree(elements), [elements]);

  const columns = useMemo<TreeGridColumn<FmeaStructureRow>[]>(
    () => [
      { id: "code", header: t("fmea.structure.columns.code") },
      { id: "name", header: t("fmea.structure.columns.name") },
      { id: "level", header: t("fmea.structure.columns.level") },
      { id: "special", header: t("fmea.structure.columns.special") },
      { id: "actions", header: "" },
    ],
    [t],
  );

  const columnWidths = useMemo(
    () => ({
      code: "minmax(160px, 1fr)",
      name: "minmax(220px, 1.6fr)",
      level: "minmax(130px, 0.8fr)",
      special: "minmax(150px, 0.9fr)",
      actions: "minmax(120px, 0.7fr)",
    }),
    [],
  );

  const renderCell = useCallback(
    ({ row, columnId }: { row: FmeaStructureRow; columnId: string }) => {
      if (columnId === "level") {
        return <Badge variant="outline">{t(`fmea.structureLevel.${row.level}`)}</Badge>;
      }

      if (columnId === "special") {
        return row.isSpecialCharacteristic ? (
          <Badge variant="secondary">{t("fmea.structure.columns.special")}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      }

      if (columnId === "actions") {
        if (!editable) {
          return null;
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              aria-label={t("fmea.actions.edit")}
              onClick={() => {
                setEditing(row);
                setIsFormOpen(true);
              }}
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
    },
    [editable, t],
  );

  async function remove() {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteStructureElementAction(pendingDelete.id);

    if (!result.success) {
      toast.error(result.error);

      return;
    }

    toast.success(t("common.delete"));
    setPendingDelete(null);
    router.refresh();
  }

  async function importFromSource() {
    const source = fmeaType === "PFMEA" ? "FLOW" : fmeaType === "DFMEA" ? "ITEM" : "PROCESS";

    const result = await importStructureFromSourceAction({ documentId, source });

    if (!result.success) {
      toast.error(result.error);

      return;
    }

    toast.success(t("fmea.structure.import.done", { count: result.created ?? 0 }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{t("fmea.structure.title")}</h2>

          <p className="text-sm text-muted-foreground">{t("fmea.structure.description")}</p>
        </div>

        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void importFromSource()} variant="outline">
              {t("fmea.structure.import")}
            </Button>

            <Button
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            >
              <Plus />

              {t("fmea.structure.add")}
            </Button>
          </div>
        ) : null}
      </div>

      <TreeGrid
        className="h-[520px] rounded-md border"
        columnWidths={columnWidths}
        columns={columns}
        data={tree.roots}
        emptyMessage={t("fmea.documents.empty.description")}
        getChildren={(row) => tree.childrenOf.get(row.id) ?? []}
        getRowId={(row) => row.id}
        renderCell={renderCell}
      />

      <Dialog onOpenChange={setIsFormOpen} open={isFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("fmea.actions.edit") : t("fmea.structure.add")}</DialogTitle>

            <DialogDescription>{t("fmea.structure.description")}</DialogDescription>
          </DialogHeader>

          <FmeaStructureElementForm
            documentId={documentId}
            element={editing}
            elements={elements}
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

/** Yapı elemanı formu. */
function FmeaStructureElementForm({
  documentId,
  element,
  elements,
  onDone,
}: {
  documentId: string;
  element: FmeaStructureRow | null;
  elements: FmeaStructureRow[];
  onDone: () => void;
}) {
  const { t } = useI18n();

  const [code, setCode] = useState(element?.code ?? "");
  const [name, setName] = useState(element?.name ?? "");
  const [description, setDescription] = useState(element?.description ?? "");
  const [level, setLevel] = useState(element?.level ?? "COMPONENT");
  const [parentId, setParentId] = useState(element?.parentId ?? "");
  const [isSpecialCharacteristic, setIsSpecialCharacteristic] = useState(
    element?.isSpecialCharacteristic ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);

    const payload: FmeaStructureElementFormValues = {
      code,
      name,
      description,
      level,
      parentId,
      flowNodeId: element?.flowNodeId ?? "",
      itemId: element?.itemId ?? "",
      processWorkElementId: "",
      isSpecialCharacteristic,
    };

    const result = element
      ? await updateStructureElementAction(element.id, payload)
      : await createStructureElementAction(documentId, payload);

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
          <FieldLabel htmlFor="structure-code">{t("fmea.structure.columns.code")}</FieldLabel>

          <Input
            id="structure-code"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="structure-name">{t("fmea.structure.columns.name")}</FieldLabel>

          <Input
            id="structure-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="structure-level">{t("fmea.structure.columns.level")}</FieldLabel>

            <NativeSelect
              id="structure-level"
              onChange={(event) => setLevel(event.target.value as typeof level)}
              value={level}
            >
              <NativeSelectOption value="SYSTEM">
                {t("fmea.structureLevel.SYSTEM")}
              </NativeSelectOption>

              <NativeSelectOption value="SUBSYSTEM">
                {t("fmea.structureLevel.SUBSYSTEM")}
              </NativeSelectOption>

              <NativeSelectOption value="COMPONENT">
                {t("fmea.structureLevel.COMPONENT")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="structure-parent">{t("fmea.structure.title")}</FieldLabel>

            <NativeSelect
              id="structure-parent"
              onChange={(event) => setParentId(event.target.value)}
              value={parentId}
            >
              <NativeSelectOption value="">-</NativeSelectOption>

              {elements
                .filter((entry) => entry.id !== element?.id)
                .map((entry) => (
                  <NativeSelectOption key={entry.id} value={entry.id}>
                    {entry.code} — {entry.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="structure-description">
            {t("fmea.form.description.label")}
          </FieldLabel>

          <Textarea
            id="structure-description"
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            value={description}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="structure-special">{t("fmea.structure.columns.special")}</FieldLabel>

          <NativeSelect
            id="structure-special"
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

/** Yapı elemanlarından ağaç kurar. */
function buildTree(elements: FmeaStructureRow[]): {
  roots: FmeaStructureRow[];
  childrenOf: Map<string, FmeaStructureRow[]>;
} {
  const childrenOf = new Map<string, FmeaStructureRow[]>();
  const roots: FmeaStructureRow[] = [];

  for (const element of elements) {
    if (!element.parentId) {
      roots.push(element);

      continue;
    }

    const list = childrenOf.get(element.parentId) ?? [];

    list.push(element);
    childrenOf.set(element.parentId, list);
  }

  return { roots, childrenOf };
}
