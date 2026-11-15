"use client";

import { type MessageKey, useI18n } from "@mqdms/i18n";
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
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { TreeGrid, type TreeGridColumn } from "@mqdms/ui/components/tree-grid";
import { ArrowDown, ArrowLeft, ArrowUp, CornerDownRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { resolveItemByStockCodeAction } from "@/features/items/actions";

import { saveBomDraftAction } from "../actions";
import {
  addRow,
  type BomGridRow,
  canHaveChildren,
  canIndentRow,
  canOutdentRow,
  indentRow,
  moveRow,
  outdentRow,
  removeSubtree,
  renumberSiblings,
  toSubmissionOrder,
} from "./bom-grid.utils";

/** Grid'e gelen satır verisi. */
export type BomGridLine = {
  id: string;
  parentLineId: string | null;
  childItemId: string;
  childItemCode: string;
  childItemName: string;
  childItemType: string;
  childItemStructureType: string;
  childItemSupplyType: string | null;
  childItemIsSellable: boolean;
  quantity: number;
  unitOfMeasureId: string | null;
  sortOrder: number;
  childItemRevisionId: string | null;
};

/** BOM'un sahibi ürün. */
export type BomGridRootItem = {
  id: string;
  code: string;
  name: string;
  itemType: string;
  structureType: string;
  supplyType: string | null;
  isSellable: boolean;
  unitOfMeasureId: string;
  unitOfMeasureCode: string | null;
};

type BomTreeGridProps = {
  revisionId: string;
  lockVersion: number;
  editable: boolean;
  rootItem: BomGridRootItem;
  initialLines: BomGridLine[];
  units: { id: string; code: string; name: string }[];
};

/** Kök satırın anahtarı. */
const ROOT_KEY = "root";

/**
 * BOM ağacı editörü.
 *
 * Satırlar TreeGrid içinde düzenlenir: stok kodu yazılıp Enter'a basıldığında
 * ürün bilgileri sunucudan gelir. Değişiklikler istemcide tutulur, "Kaydet"
 * ile tek seferde sunucuya gönderilir.
 */
export function BomTreeGrid({
  revisionId,
  lockVersion,
  editable,
  rootItem,
  initialLines,
  units,
}: BomTreeGridProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [rows, setRows] = useState<BomGridRow[]>(() =>
    initialLines.map((line) => ({
      key: line.id,
      parentKey: line.parentLineId,
      childItemId: line.childItemId,
      code: line.childItemCode,
      name: line.childItemName,
      itemType: line.childItemType,
      structureType: line.childItemStructureType,
      supplyType: line.childItemSupplyType,
      isSellable: line.childItemIsSellable,
      quantity: line.quantity,
      unitOfMeasureId: line.unitOfMeasureId,
      sortOrder: line.sortOrder,
      error: null,
    })),
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [ROOT_KEY]: true });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const [conflict, setConflict] = useState<string | null>(null);

  const [currentLockVersion, setCurrentLockVersion] = useState(lockVersion);

  const codeInputRefs = useRef(new Map<string, HTMLInputElement>());

  const rootRow = useMemo<BomGridRow>(
    () => ({
      key: ROOT_KEY,
      parentKey: null,
      childItemId: rootItem.id,
      code: rootItem.code,
      name: rootItem.name,
      itemType: rootItem.itemType,
      structureType: rootItem.structureType,
      supplyType: rootItem.supplyType,
      isSellable: rootItem.isSellable,
      quantity: 1,
      unitOfMeasureId: rootItem.unitOfMeasureId,
      sortOrder: 0,
      error: null,
    }),
    [rootItem],
  );

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, BomGridRow[]>();

    for (const row of rows) {
      const list = map.get(row.parentKey) ?? [];

      list.push(row);
      map.set(row.parentKey, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return map;
  }, [rows]);

  const treeData = useMemo(() => [rootRow], [rootRow]);

  const getChildren = useCallback(
    (node: BomGridRow): BomGridRow[] => childrenMap.get(node.key) ?? [],
    [childrenMap],
  );

  const getRowId = useCallback((node: BomGridRow) => node.key, []);

  const columns = useMemo<TreeGridColumn<BomGridRow>[]>(
    () => [
      { id: "tree", header: t("boms.grid.columns.tree") },
      { id: "code", header: t("boms.grid.columns.code") },
      { id: "name", header: t("boms.grid.columns.name") },
      { id: "type", header: t("boms.grid.columns.type") },
      { id: "supply", header: t("boms.grid.columns.supply") },
      { id: "sellable", header: t("boms.grid.columns.isSellable") },
      { id: "quantity", header: t("boms.grid.columns.quantity") },
      { id: "unit", header: t("boms.grid.columns.unit") },
      { id: "actions", header: "" },
    ],
    [t],
  );

  const columnWidths = useMemo(
    () => ({
      tree: "minmax(190px, 1.2fr)",
      code: "minmax(140px, 0.9fr)",
      name: "minmax(170px, 1.3fr)",
      type: "minmax(110px, 0.7fr)",
      supply: "minmax(110px, 0.7fr)",
      sellable: "minmax(90px, 0.6fr)",
      quantity: "minmax(100px, 0.6fr)",
      unit: "minmax(120px, 0.8fr)",
      actions: "minmax(140px, 0.9fr)",
    }),
    [],
  );

  const selectedRow = useMemo(
    () => rows.find((row) => row.key === selectedKey) ?? null,
    [rows, selectedKey],
  );

  /** Kaydedilmemiş değişiklik varsa sayfadan çıkarken uyarılır. */
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const updateRow = useCallback((key: string, patch: Partial<BomGridRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setDirty(true);
  }, []);

  /** Yeni satır ekler ve stok kodu hücresine odaklanır. */
  const addNewRow = useCallback((parentKey: string | null) => {
    const key = `new:${crypto.randomUUID()}`;

    setRows((current) => renumberSiblings(addRow(current, parentKey, key), parentKey));
    setSelectedKey(key);
    setDirty(true);

    /*
     * Hücre sanallaştırılmış olabilir; odaklama bir sonraki çizimde yapılır.
     */
    window.setTimeout(() => {
      codeInputRefs.current.get(key)?.focus();
    }, 0);
  }, []);

  /** Aynı seviyeye yeni satır ekler. */
  const addSibling = useCallback(() => {
    addNewRow(selectedRow ? selectedRow.parentKey : null);
  }, [selectedRow, addNewRow]);

  /** Seçili satırın altına yeni satır ekler. */
  const addChild = useCallback(() => {
    if (!selectedRow || !canHaveChildren(selectedRow)) {
      return;
    }

    addNewRow(selectedRow.key);
  }, [selectedRow, addNewRow]);

  /** Stok kodunu sunucuda çözümler. */
  const resolveCode = useCallback(
    async (rowKey: string) => {
      const row = rows.find((candidate) => candidate.key === rowKey);

      if (!row || row.code.trim() === "") {
        return;
      }

      updateRow(rowKey, { error: null });

      const result = await resolveItemByStockCodeAction(row.code);

      if (!result.success) {
        updateRow(rowKey, { error: result.error, childItemId: null });
        return;
      }

      updateRow(rowKey, {
        childItemId: result.item.id,
        code: result.item.code,
        name: result.item.name,
        itemType: result.item.itemType,
        structureType: result.item.structureType,
        supplyType: result.item.supplyType,
        isSellable: result.item.isSellable,
        unitOfMeasureId: row.unitOfMeasureId ?? result.item.unitOfMeasureId,
        error: null,
      });
    },
    [rows, updateRow],
  );

  const moveRowTo = useCallback((key: string, direction: "up" | "down") => {
    setRows((current) => moveRow(current, key, direction));
    setDirty(true);
  }, []);

  const indentRowTo = useCallback((key: string) => {
    setRows((current) => indentRow(current, key));
    setDirty(true);
  }, []);

  const outdentRowTo = useCallback((key: string) => {
    setRows((current) => outdentRow(current, key));
    setDirty(true);
  }, []);

  const removeRowTo = useCallback((key: string) => {
    setRows((current) => removeSubtree(current, key));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    const unresolved = rows.find((row) => !row.childItemId || row.error);

    if (unresolved) {
      toast.error(t("boms.grid.errors.unresolvedRow"));

      return;
    }

    setSaving(true);
    setConflict(null);

    const result = await saveBomDraftAction({
      revisionId,
      expectedLockVersion: currentLockVersion,
      lines: toSubmissionOrder(rows).map((row) => ({
        id: row.key,
        parentLineId: row.parentKey,
        childItemId: row.childItemId as string,
        quantity: row.quantity,
        unitOfMeasureId: row.unitOfMeasureId,
        sortOrder: row.sortOrder,
        childItemRevisionId: null,
      })),
    });

    setSaving(false);

    if (!result.success) {
      if (result.conflict) {
        setConflict(result.error);
      }

      toast.error(result.error);

      return;
    }

    /*
     * Sunucunun ürettiği satır kimlikleri istemciye geri verilir; geçici
     * kimlikler gerçek kimliklerle değiştirilir.
     */
    setRows((current) => current.map((row) => ({ ...row, key: result.idMap[row.key] ?? row.key })));

    setCurrentLockVersion(result.lockVersion);
    setDirty(false);

    toast.success(t("boms.grid.saved"));

    router.refresh();
  }, [rows, revisionId, currentLockVersion, t, router]);

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = { [ROOT_KEY]: true };

    for (const row of rows) {
      if (canHaveChildren(row)) {
        next[row.key] = true;
      }
    }

    setExpanded(next);
  }, [rows]);

  const collapseAll = useCallback(() => {
    setExpanded({ [ROOT_KEY]: true });
  }, []);

  const renderCell = useCallback(
    ({ row, columnId }: { row: BomGridRow; columnId: string }) => {
      const isRoot = row.key === ROOT_KEY;

      switch (columnId) {
        case "code":
          if (isRoot) {
            return <span className="font-medium">{row.code}</span>;
          }

          return (
            <Input
              aria-label={t("boms.grid.columns.code")}
              className="h-8"
              disabled={!editable}
              onChange={(event) => updateRow(row.key, { code: event.target.value })}
              onFocus={() => setSelectedKey(row.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void resolveCode(row.key);
                }
              }}
              ref={(element) => {
                if (element) {
                  codeInputRefs.current.set(row.key, element);
                } else {
                  codeInputRefs.current.delete(row.key);
                }
              }}
              value={row.code}
            />
          );

        case "name":
          return (
            <span className={row.error ? "text-destructive" : undefined}>
              {row.name || "-"}
              {row.error ? <span className="block text-xs">{row.error}</span> : null}
            </span>
          );

        case "type":
          return (
            <span>{row.itemType ? t(`items.itemType.${row.itemType}` as MessageKey) : "-"}</span>
          );

        case "supply":
          return (
            <span>
              {row.supplyType ? t(`items.supplyType.${row.supplyType}` as MessageKey) : "-"}
            </span>
          );

        case "sellable":
          return <span>{row.isSellable ? t("items.sellable.yes") : t("items.sellable.no")}</span>;

        case "quantity":
          if (isRoot) {
            return <span>1</span>;
          }

          return (
            <Input
              aria-label={t("boms.grid.columns.quantity")}
              className="h-8"
              disabled={!editable}
              min={0}
              onChange={(event) => {
                const value = Number(event.target.value);

                updateRow(row.key, {
                  quantity: Number.isFinite(value) && value > 0 ? value : row.quantity,
                });
              }}
              onFocus={() => setSelectedKey(row.key)}
              step="any"
              type="number"
              value={row.quantity}
            />
          );

        case "unit":
          if (isRoot) {
            return <span>{rootItem.unitOfMeasureCode ?? "-"}</span>;
          }

          return (
            <NativeSelect
              aria-label={t("boms.grid.columns.unit")}
              className="h-8"
              disabled={!editable}
              onChange={(event) => updateRow(row.key, { unitOfMeasureId: event.target.value })}
              onFocus={() => setSelectedKey(row.key)}
              value={row.unitOfMeasureId ?? ""}
            >
              <NativeSelectOption value="">{t("boms.grid.unit.default")}</NativeSelectOption>

              {units.map((candidate) => (
                <NativeSelectOption key={candidate.id} value={candidate.id}>
                  {candidate.code}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          );

        case "actions":
          if (isRoot) {
            return null;
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                aria-label={t("boms.grid.actions.moveUp")}
                disabled={!editable}
                onClick={() => moveRowTo(row.key, "up")}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowUp className="size-4" />
              </Button>

              <Button
                aria-label={t("boms.grid.actions.moveDown")}
                disabled={!editable}
                onClick={() => moveRowTo(row.key, "down")}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowDown className="size-4" />
              </Button>

              <Button
                aria-label={t("boms.grid.actions.indent")}
                disabled={!editable || !canIndentRow(rows, row.key)}
                onClick={() => indentRowTo(row.key)}
                size="icon-sm"
                variant="ghost"
              >
                <CornerDownRight className="size-4" />
              </Button>

              <Button
                aria-label={t("boms.grid.actions.outdent")}
                disabled={!editable || !canOutdentRow(rows, row.key)}
                onClick={() => outdentRowTo(row.key)}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
              </Button>

              <Button
                aria-label={t("boms.grid.actions.delete")}
                disabled={!editable}
                onClick={() => setPendingDeleteKey(row.key)}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );

        default:
          return null;
      }
    },
    [
      editable,
      indentRowTo,
      moveRowTo,
      outdentRowTo,
      resolveCode,
      rootItem.unitOfMeasureCode,
      rows,
      t,
      units,
      updateRow,
    ],
  );

  const pendingDeleteRow = pendingDeleteKey
    ? rows.find((row) => row.key === pendingDeleteKey)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!editable} onClick={addSibling} size="sm" variant="outline">
          {t("boms.grid.actions.addRow")}
        </Button>

        <Button
          disabled={!editable || !selectedRow || !canHaveChildren(selectedRow)}
          onClick={addChild}
          size="sm"
          variant="outline"
        >
          {t("boms.grid.actions.addChild")}
        </Button>

        <Button disabled={!editable} onClick={expandAll} size="sm" variant="ghost">
          {t("boms.grid.actions.expandAll")}
        </Button>

        <Button disabled={!editable} onClick={collapseAll} size="sm" variant="ghost">
          {t("boms.grid.actions.collapseAll")}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <span className="text-muted-foreground text-xs">{t("boms.grid.dirty")}</span>
          ) : null}

          <Button disabled={!editable || !dirty} onClick={() => void handleSave()} size="sm">
            {saving ? t("boms.grid.saving") : t("boms.grid.save")}
          </Button>
        </div>
      </div>

      {conflict ? (
        <div className="border-destructive bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {conflict}
        </div>
      ) : null}

      {selectedRow && !canHaveChildren(selectedRow) ? (
        <p className="text-muted-foreground text-xs">{t("boms.grid.errors.parentIsLeaf")}</p>
      ) : null}

      <TreeGrid
        className="h-[560px] rounded-md border"
        columnWidths={columnWidths}
        columns={columns}
        data={treeData}
        emptyMessage={t("boms.grid.empty")}
        expanded={expanded}
        getChildren={getChildren}
        getRowId={getRowId}
        onExpandedChange={setExpanded}
        onRowClick={(row) => setSelectedKey(row.key)}
        renderCell={renderCell}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteKey(null);
          }
        }}
        open={pendingDeleteKey !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("boms.grid.delete.title")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("boms.grid.delete.description", {
                code: pendingDeleteRow?.code ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteKey) {
                  removeRowTo(pendingDeleteKey);
                }

                setPendingDeleteKey(null);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
