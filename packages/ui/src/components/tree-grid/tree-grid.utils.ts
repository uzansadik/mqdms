import type { FlattenTreeRowsOptions, TreeGridRow } from "./tree-grid-types";

/**
 * Hiyerarşik satırları, açık satırların altındakiler dâhil, düz listeye
 * çevirir.
 *
 * Fonksiyon **saf**tır: verilmiş ağaç ve açma durumu ile görünür satır
 * listesini üretir. Sanallaştırma bu liste üzerinde çalışır.
 */
export function flattenTreeRows<TData>(
  rows: TData[],
  options: FlattenTreeRowsOptions<TData>,
): TreeGridRow<TData>[] {
  const { getRowId, getChildren, expanded } = options;

  const result: TreeGridRow<TData>[] = [];

  const walk = (currentRows: TData[], depth: number, parentId: string | null) => {
    currentRows.forEach((row, index) => {
      const id = getRowId(row, index);
      const children = getChildren?.(row) ?? [];
      const hasChildren = children.length > 0;
      const isExpanded = hasChildren && expanded[id] === true;

      result.push({
        id,
        parentId,
        depth,
        data: row,
        hasChildren,
        isExpanded,
        position: index + 1,
      });

      if (isExpanded) {
        walk(children, depth + 1, id);
      }
    });
  };

  walk(rows, 0, null);

  return result;
}

/**
 * Bir satırın üst satır kimliğini bulur.
 *
 * Taşıma (move) işlemlerinde yeni üst satırın geçerli üst satırıyla aynı
 * seviyeye gelip gelmediğini denetlemek için kullanılır.
 */
export function findParentId<TData>(rows: TreeGridRow<TData>[], rowId: string): string | null {
  const row = rows.find((candidate) => candidate.id === rowId);

  return row?.parentId ?? null;
}

/** Satırın kardeşleri arasındaki sırası. */
export function findSiblingIndex<TData>(rows: TreeGridRow<TData>[], rowId: string): number {
  const row = rows.find((candidate) => candidate.id === rowId);

  if (!row) {
    return -1;
  }

  return rows
    .filter((candidate) => candidate.parentId === row.parentId && candidate.depth === row.depth)
    .findIndex((candidate) => candidate.id === rowId);
}
