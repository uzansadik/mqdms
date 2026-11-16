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
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { TreeGrid, type TreeGridColumn } from "@mqdms/ui/components/tree-grid";
import { ArrowDown, ArrowLeft, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { resolveItemByStockCodeAction } from "@/features/items/actions";

import { saveBomDraftAction } from "../actions";
import {
  addRow,
  type BomGridRow,
  buildTree,
  canIndentRow,
  canOutdentRow,
  formatQuantity,
  indentRow,
  moveRow,
  outdentRow,
  parseQuantity,
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

/**
 * BOM ağacı editörü.
 *
 * Ürün (BOM'un sahibi) grid'in **üstünde** başlık olarak durur; grid'in içi
 * yalnızca ürünün bileşenlerini gösterir.
 *
 * "Ürün Ekle" seçili satırın **altına** ekler; hiçbir satır seçili değilse
 * ürünün doğrudan altına (grid'in en üst seviyesine) ekler. Satırlar
 * TreeGrid içinde düzenlenir: stok kodu yazılıp Enter'a basıldığında ürün
 * bilgileri sunucudan gelir.
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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const [conflict, setConflict] = useState<string | null>(null);

  const [currentLockVersion, setCurrentLockVersion] = useState(lockVersion);

  const codeInputRefs = useRef(new Map<string, HTMLInputElement>());

  const tree = useMemo(() => buildTree(rows), [rows]);

  const columns = useMemo<TreeGridColumn<BomGridRow>[]>(
    () => [
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
      code: "minmax(170px, 1.1fr)",
      name: "minmax(170px, 1.3fr)",
      type: "minmax(100px, 0.6fr)",
      supply: "minmax(100px, 0.6fr)",
      sellable: "minmax(90px, 0.5fr)",
      quantity: "minmax(90px, 0.5fr)",
      unit: "minmax(100px, 0.6fr)",
      actions: "minmax(140px, 0.8fr)",
    }),
    [],
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

  /**
   * Yeni satır ekler.
   *
   * Seçili satır varsa altına, yoksa ürünün doğrudan altına eklenir.
   */
  const addProduct = useCallback(() => {
    const key = `new:${crypto.randomUUID()}`;
    const parentKey = selectedKey;

    setRows((current) => renumberSiblings(addRow(current, parentKey, key), parentKey));
    setSelectedKey(key);
    setDirty(true);

    /* Yeni satırın üst dalı açık olmalı ki satır görünsün. */
    if (parentKey) {
      setExpanded((current) => ({ ...current, [parentKey]: true }));
    }

    window.setTimeout(() => {
      codeInputRefs.current.get(key)?.focus();
    }, 0);
  }, [selectedKey]);

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
    setSelectedKey(null);
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
     * kimlikler gerçek kimliklerle değiştirilir. Üst satır bağlantısı da
     * çevrilir: aksi halde yeni satırın altındaki çocuklar ağaçta kopuk
     * kalır.
     */
    setRows((current) =>
      current.map((row) => ({
        ...row,
        key: result.idMap[row.key] ?? row.key,
        parentKey: row.parentKey ? (result.idMap[row.parentKey] ?? row.parentKey) : null,
      })),
    );

    setSelectedKey((current) => (current ? (result.idMap[current] ?? current) : current));

    /* Açık satırların durumu da yeni kimliklere taşınır. */
    setExpanded((current) => {
      const next: Record<string, boolean> = {};

      for (const [key, value] of Object.entries(current)) {
        next[result.idMap[key] ?? key] = value;
      }

      return next;
    });

    setCurrentLockVersion(result.lockVersion);
    setDirty(false);

    toast.success(t("boms.grid.saved"));

    router.refresh();
  }, [rows, revisionId, currentLockVersion, t, router]);

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {};

    for (const row of rows) {
      next[row.key] = true;
    }

    setExpanded(next);
  }, [rows]);

  const collapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  const renderCell = useCallback(
    ({ row, columnId }: { row: BomGridRow; columnId: string }) => {
      switch (columnId) {
        case "code":
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
          return <span>{row.itemType ? t(`items.itemType.${row.itemType}` as never) : "-"}</span>;

        case "supply":
          return (
            <span>{row.supplyType ? t(`items.supplyType.${row.supplyType}` as never) : "-"}</span>
          );

        case "sellable":
          return <span>{row.isSellable ? t("items.sellable.yes") : t("items.sellable.no")}</span>;

        case "quantity":
          return (
            <Input
              aria-label={t("boms.grid.columns.quantity")}
              className="h-8"
              disabled={!editable}
              inputMode="decimal"
              onBlur={() => {
                updateRow(row.key, { quantityText: undefined });
              }}
              onChange={(event) => {
                const raw = event.target.value;
                const parsed = parseQuantity(raw);

                updateRow(row.key, {
                  quantityText: raw,
                  quantity: parsed !== null && parsed > 0 ? parsed : row.quantity,
                });
              }}
              onFocus={() => setSelectedKey(row.key)}
              placeholder="0"
              value={row.quantityText ?? formatQuantity(row.quantity)}
            />
          );

        case "unit":
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
    [editable, indentRowTo, moveRowTo, outdentRowTo, resolveCode, rows, t, units, updateRow],
  );

  const pendingDeleteRow = pendingDeleteKey
    ? rows.find((row) => row.key === pendingDeleteKey)
    : null;

  return (
    <div className="space-y-3">
      {/*
       * Ürün grid'in üstünde başlık olarak durur: grid'in içeriği yalnızca
       * ürünün bileşenleridir.
       */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <span className="font-medium">{rootItem.code}</span>

        <span>{rootItem.name}</span>

        <Badge variant="outline">{t(`items.itemType.${rootItem.itemType}` as never)}</Badge>

        <span className="text-muted-foreground text-xs">
          {rootItem.supplyType ? t(`items.supplyType.${rootItem.supplyType}` as never) : "-"}
        </span>

        <span className="text-muted-foreground text-xs">
          {rootItem.isSellable ? t("items.sellable.yes") : t("items.sellable.no")}
        </span>

        <span className="text-muted-foreground ml-auto text-xs">
          1 {rootItem.unitOfMeasureCode ?? ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!editable} onClick={addProduct} size="sm" variant="outline">
          <Plus className="size-4" />
          {t("boms.grid.actions.addRow")}
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

      <TreeGrid
        className="h-[560px] rounded-md border"
        columnWidths={columnWidths}
        columns={columns}
        data={tree.roots}
        emptyMessage={t("boms.grid.empty")}
        expanded={expanded}
        getChildren={(row) => tree.childrenOf.get(row.key) ?? []}
        getRowId={(row) => row.key}
        onExpandedChange={setExpanded}
        onRowClick={(row) => setSelectedKey(row.key)}
        renderCell={renderCell}
        selectedId={selectedKey}
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
