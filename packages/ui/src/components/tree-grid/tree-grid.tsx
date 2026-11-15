/*
 * biome-ignore-all lint/a11y/useSemanticElements: sanallaştırılmış grid, tablo
 * yerine div tabanlı kurulur; ARIA `treegrid` rolleri doğrudan kullanılır.
 */
"use client";

import { cn } from "@mqdms/ui/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TreeGridProps } from "./tree-grid-types";

/**
 * Genel amaçlı hiyerarşik veri tablosu.
 *
 * Bileşen hiyerarşi dışındaki iş kurallarını bilmez: satır verisi, sütun
 * tanımları, açma/kapatma durumu ve seçim dışarıdan verilir. Uzun ağaçlarda
 * bütün satırlar DOM'a basılmaz; yalnızca görünür pencere işlenir.
 */
export function TreeGrid<TData>({
  data,
  columns,
  getRowId,
  getChildren,
  expanded,
  onExpandedChange,
  selectedId,
  onRowClick,
  estimateRowHeight = 44,
  columnWidths,
  emptyMessage,
  className,
  renderCell,
}: TreeGridProps<TData>) {
  const [internalExpanded, setInternalExpanded] = useState<Record<string, boolean>>({});

  const isControlled = expanded !== undefined;

  const expandedState = isControlled ? expanded : internalExpanded;

  const handleExpandedChange = useCallback(
    (next: Record<string, boolean>) => {
      if (!isControlled) {
        setInternalExpanded(next);
      }

      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getSubRows: getChildren,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: { expanded: expandedState },
    onExpandedChange: (updater) => {
      const next = typeof updater === "function" ? updater(expandedState) : updater;

      handleExpandedChange(next as Record<string, boolean>);
    },
    enableExpanding: true,
  });

  const leafColumns = table.getVisibleLeafColumns();

  const gridTemplateColumns = useMemo(() => {
    if (!columnWidths) {
      return undefined;
    }

    return leafColumns.map((column) => columnWidths[column.id] ?? "1fr").join(" ");
  }, [leafColumns, columnWidths]);

  /*
   * Görünür satırlar: köklerden başlanır, açık satırların altı açılır.
   * Düz liste sanallaştırma için kullanılır.
   */
  const rows = useMemo(() => {
    const visible: { row: Row<TData>; depth: number }[] = [];

    const walk = (tableRows: Row<TData>[], depth: number) => {
      for (const row of tableRows) {
        visible.push({ row, depth });

        if (row.getCanExpand() && expandedState[row.id]) {
          walk(row.subRows, depth + 1);
        }
      }
    };

    walk(table.getRowModel().rows, 0);

    return visible;
  }, [table, expandedState]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const listRef = useRef<HTMLDivElement>(null);

  /*
   * Yapışkan başlık, sanallaştırılmış listenin **üstünde** durur. Liste
   * kapsayıcının içinde kaydığı için sanallaştırıcıya listenin başlangıç
   * kaydırması bildirilir; aksi halde satırlar başlık yüksekliği kadar
   * kayar.
   */
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const update = () => {
      setScrollMargin(listRef.current?.offsetTop ?? 0);
    };

    update();

    const element = scrollRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(update);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
    scrollMargin,
  });

  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  /*
   * İlk satır odaklanabilir olmalıdır: klavyeyle gezinmeye başlamak için
   * odaklanacak bir satır bulunmalıdır.
   */
  useEffect(() => {
    if (focusedRowId || rows.length === 0) {
      return;
    }

    setFocusedRowId(rows[0]?.row.id ?? null);
  }, [focusedRowId, rows]);

  useEffect(() => {
    if (!focusedRowId) {
      return;
    }

    rowRefs.current.get(focusedRowId)?.focus();
  }, [focusedRowId]);

  const focusRow = useCallback(
    (index: number) => {
      if (rows.length === 0) {
        return;
      }

      const bounded = Math.max(0, Math.min(index, rows.length - 1));
      const row = rows[bounded];

      if (!row) {
        return;
      }

      setFocusedRowId(row.row.id);

      virtualizer.scrollToIndex(bounded, { align: "auto" });
    },
    [rows, virtualizer],
  );

  const toggleRow = useCallback(
    (rowId: string) => {
      handleExpandedChange({ ...expandedState, [rowId]: !expandedState[rowId] });
    },
    [expandedState, handleExpandedChange],
  );

  /**
   * Klavye gezinmesi.
   *
   * Düzenlenebilir alanlarda (input, textarea) tuşlar ağaç komutuna
   * dönüşmez: yalnızca satır üzerinde gezinilir.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, rowId: string) => {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const index = rows.findIndex((row) => row.row.id === rowId);

      if (index < 0) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusRow(index + 1);
          break;

        case "ArrowUp":
          event.preventDefault();
          focusRow(index - 1);
          break;

        case "ArrowRight": {
          const row = rows[index]?.row;

          if (row?.getCanExpand() && !expandedState[row.id]) {
            event.preventDefault();
            toggleRow(row.id);
          }

          break;
        }

        case "ArrowLeft": {
          const row = rows[index]?.row;

          if (row?.getCanExpand() && expandedState[row.id]) {
            event.preventDefault();
            toggleRow(row.id);
          }

          break;
        }

        case "Home":
          event.preventDefault();
          focusRow(0);
          break;

        case "End":
          event.preventDefault();
          focusRow(rows.length - 1);
          break;

        default:
          break;
      }
    },
    [rows, expandedState, focusRow, toggleRow],
  );

  const headerGroups = table.getHeaderGroups();

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        aria-rowcount={rows.length}
        className="relative min-h-0 flex-1 overflow-auto"
        ref={scrollRef}
        role="treegrid"
      >
        {/*
         * Başlık kaydırma alanının **içinde** ve yapışkan olmalı: aksi halde
         * yatay kaydırmada başlık satırlarla hizalanmaz.
         */}
        {headerGroups.map((headerGroup) => (
          <div
            className="bg-muted/40 sticky top-0 z-10 grid border-b text-sm font-medium"
            key={headerGroup.id}
            role="row"
            style={{ gridTemplateColumns }}
            tabIndex={-1}
          >
            {headerGroup.headers.map((header) => (
              <div
                className="flex items-center px-3 py-2"
                key={header.id}
                role="columnheader"
                tabIndex={-1}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">{emptyMessage}</div>
        ) : (
          <div
            className="relative w-full"
            ref={listRef}
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = rows[virtualRow.index];

              if (!entry) {
                return null;
              }

              const { row, depth } = entry;
              const canExpand = row.getCanExpand();
              const isFocused = focusedRowId === row.id;
              const isSelected = selectedId === row.id;
              const cells = row.getVisibleCells();

              return (
                <div
                  aria-expanded={canExpand ? expandedState[row.id] === true : undefined}
                  aria-level={depth + 1}
                  aria-posinset={row.index + 1}
                  aria-selected={isSelected}
                  className={cn(
                    "bg-background absolute top-0 left-0 grid w-full items-center border-b text-sm",
                    "hover:bg-muted/40",
                    isFocused && "bg-muted/40",
                    isSelected && "bg-muted/70 border-l-2 border-l-primary",
                  )}
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  onFocus={() => setFocusedRowId(row.id)}
                  onKeyDown={(event) => onKeyDown(event, row.id)}
                  ref={(element) => {
                    if (element) {
                      rowRefs.current.set(row.id, element);
                    } else {
                      rowRefs.current.delete(row.id);
                    }
                  }}
                  role="row"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                  tabIndex={isFocused ? 0 : -1}
                >
                  {cells.map((cell, columnIndex) => (
                    <div
                      className={cn("flex min-w-0 items-center px-3", columnIndex === 0 && "gap-1")}
                      key={cell.id}
                      role="gridcell"
                      tabIndex={-1}
                    >
                      {columnIndex === 0 ? (
                        <>
                          <button
                            aria-label={expandedState[row.id] ? "Satırı daralt" : "Satırı genişlet"}
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded",
                              canExpand ? "hover:bg-muted" : "pointer-events-none opacity-0",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleRow(row.id);
                            }}
                            tabIndex={-1}
                            type="button"
                          >
                            {expandedState[row.id] ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>

                          <span
                            aria-hidden="true"
                            className="shrink-0"
                            style={{ width: `${depth * 16}px` }}
                          />
                        </>
                      ) : null}

                      <div className="min-w-0 flex-1 overflow-hidden">
                        {renderCell
                          ? renderCell({
                              row: row.original,
                              columnId: cell.column.id,
                              depth,
                            })
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <span aria-live="polite" className="sr-only">
        {`${rows.length} satır`}
      </span>
    </div>
  );
}
