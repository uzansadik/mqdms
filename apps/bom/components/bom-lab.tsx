"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { TreeGrid, type TreeGridColumn } from "@mqdms/ui/components/tree-grid";
import { ArrowDown, ArrowLeft, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  addRow,
  buildTree,
  indentRow,
  type LabRow,
  moveRow,
  outdentRow,
  removeSubtree,
} from "../lib/bom-grid";
import {
  findMockItemByCode,
  type MockBom,
  type MockBomRevision,
  type MockItem,
} from "../lib/mock-bom";

type BomLabProps = {
  bom: MockBom;
  revision: MockBomRevision;
  rootItem: MockItem;
  items: MockItem[];
  units: { id: string; code: string; name: string }[];
  initialLines: {
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
  }[];
};

/**
 * BOM ağacı laboratuvarı.
 *
 * Gerçek kayıt yoktur: satırlar yalnızca bellekte tutulur. Amaç, ağaç
 * görünümünü ve düzenleme davranışını deploy edilmeden denemektir.
 */
export function BomLab({ bom, revision, rootItem, items, units, initialLines }: BomLabProps) {
  const { t } = useI18n();

  const [rows, setRows] = useState<LabRow[]>(() =>
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

  const codeInputRefs = useRef(new Map<string, HTMLInputElement>());

  const tree = useMemo(() => buildTree(rows), [rows]);

  const columns = useMemo<TreeGridColumn<LabRow>[]>(
    () => [
      { id: "code", header: "Stok Kodu" },
      { id: "name", header: "Ürün Adı" },
      { id: "type", header: "Tip" },
      { id: "supply", header: "Tedarik" },
      { id: "sellable", header: "Satılabilir" },
      { id: "quantity", header: "Miktar" },
      { id: "unit", header: "Birim" },
      { id: "actions", header: "" },
    ],
    [],
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

  const updateRow = useCallback((key: string, patch: Partial<LabRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  /** Seçili satırın altına (seçim yoksa en üste) yeni satır ekler. */
  const addProduct = useCallback(() => {
    const key = `new-${crypto.randomUUID()}`;

    setRows((current) => addRow(current, selectedKey, key));
    setSelectedKey(key);

    if (selectedKey) {
      setExpanded((current) => ({ ...current, [selectedKey]: true }));
    }

    window.setTimeout(() => {
      codeInputRefs.current.get(key)?.focus();
    }, 0);
  }, [selectedKey]);

  /** Stok kodunu mock katalogda çözer. */
  const resolveCode = useCallback(
    (rowKey: string) => {
      const row = rows.find((candidate) => candidate.key === rowKey);

      if (!row || row.code.trim() === "") {
        return;
      }

      const item = findMockItemByCode(row.code);

      if (!item) {
        updateRow(rowKey, { error: "Stok kodu bulunamadı.", childItemId: null });

        return;
      }

      updateRow(rowKey, {
        childItemId: item.id,
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        structureType: item.structureType,
        supplyType: item.supplyType,
        isSellable: item.isSellable,
        unitOfMeasureId: row.unitOfMeasureId ?? item.unitOfMeasureId,
        error: null,
      });
    },
    [rows, updateRow],
  );

  const renderCell = useCallback(
    ({ row, columnId }: { row: LabRow; columnId: string }) => {
      switch (columnId) {
        case "code":
          return (
            <Input
              aria-label="Stok Kodu"
              className="h-8"
              onChange={(event) => updateRow(row.key, { code: event.target.value })}
              onFocus={() => setSelectedKey(row.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  resolveCode(row.key);
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
          return <span>{row.itemType ?? "-"}</span>;

        case "supply":
          return <span>{row.supplyType ?? "-"}</span>;

        case "sellable":
          return <span>{row.isSellable ? "Evet" : "Hayır"}</span>;

        case "quantity":
          return (
            <Input
              aria-label="Miktar"
              className="h-8"
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
          return (
            <NativeSelect
              aria-label="Birim"
              className="h-8"
              onChange={(event) => updateRow(row.key, { unitOfMeasureId: event.target.value })}
              onFocus={() => setSelectedKey(row.key)}
              value={row.unitOfMeasureId ?? ""}
            >
              <NativeSelectOption value="">Ürün birimi</NativeSelectOption>

              {units.map((unit) => (
                <NativeSelectOption key={unit.id} value={unit.id}>
                  {unit.code}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          );

        case "actions":
          return (
            <div className="flex items-center gap-1">
              <Button
                aria-label="Yukarı taşı"
                onClick={() => setRows((current) => moveRow(current, row.key, "up"))}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowUp className="size-4" />
              </Button>

              <Button
                aria-label="Aşağı taşı"
                onClick={() => setRows((current) => moveRow(current, row.key, "down"))}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowDown className="size-4" />
              </Button>

              <Button
                aria-label="İçeri al"
                onClick={() => setRows((current) => indentRow(current, row.key))}
                size="icon-sm"
                variant="ghost"
              >
                <CornerDownRight className="size-4" />
              </Button>

              <Button
                aria-label="Dışarı taşı"
                onClick={() => setRows((current) => outdentRow(current, row.key))}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
              </Button>

              <Button
                aria-label="Sil"
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
    [resolveCode, updateRow, units],
  );

  const pendingDeleteRow = pendingDeleteKey
    ? rows.find((row) => row.key === pendingDeleteKey)
    : null;

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">
          BOM laboratuvarı · {bom.code} · {revision.revision}
        </h1>

        <p className="text-muted-foreground text-sm">
          Mock veri · {items.length} ürün · {rows.length} satır · {t("boms.grid.empty")}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <span className="font-medium">{rootItem.code}</span>

        <span>{rootItem.name}</span>

        <Badge variant="outline">{rootItem.itemType}</Badge>

        <span className="text-muted-foreground text-xs">{rootItem.supplyType}</span>

        <span className="text-muted-foreground text-xs">
          {rootItem.isSellable ? "Satılabilir" : "Satılamaz"}
        </span>

        <span className="text-muted-foreground ml-auto text-xs">
          1 {rootItem.unitOfMeasureCode}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={addProduct} size="sm" variant="outline">
          <Plus className="size-4" />
          Ürün Ekle
        </Button>

        <Button
          onClick={() => {
            const next: Record<string, boolean> = {};

            for (const row of rows) {
              next[row.key] = true;
            }

            setExpanded(next);
          }}
          size="sm"
          variant="ghost"
        >
          Tümünü aç
        </Button>

        <Button onClick={() => setExpanded({})} size="sm" variant="ghost">
          Tümünü kapat
        </Button>

        <span className="text-muted-foreground ml-auto text-xs">
          {rows.length} satır · seçili: {selectedKey ?? "-"}
        </span>
      </div>

      <TreeGrid
        className="h-[620px] rounded-md border"
        columnWidths={columnWidths}
        columns={columns}
        data={tree.roots}
        emptyMessage="Bu revision'da henüz bileşen satırı yok."
        expanded={expanded}
        getChildren={(row) => tree.childrenOf.get(row.key) ?? []}
        getRowId={(row) => row.key}
        onExpandedChange={setExpanded}
        onRowClick={(row) => setSelectedKey(row.key)}
        renderCell={renderCell}
        selectedId={selectedKey}
      />

      {pendingDeleteKey ? (
        <div className="flex items-center gap-3 rounded-md border border-destructive/50 px-3 py-2 text-sm">
          <span>
            &quot;{pendingDeleteRow?.code ?? ""}&quot; ve altındaki bütün satırlar silinecek.
          </span>

          <Button
            onClick={() => {
              setRows((current) => removeSubtree(current, pendingDeleteKey));
              setPendingDeleteKey(null);
              setSelectedKey(null);
            }}
            size="sm"
            variant="destructive"
          >
            Sil
          </Button>

          <Button onClick={() => setPendingDeleteKey(null)} size="sm" variant="ghost">
            Vazgeç
          </Button>
        </div>
      ) : null}
    </div>
  );
}
