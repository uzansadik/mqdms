/**
 * BOM laboratuvarının satır modeli.
 *
 * Uygulamanın ağaç mantığından bağımsız kopya: burada yalnızca görünüm
 * denenir, kayıt yoktur.
 */

/** Grid satırı. */
export type LabRow = {
  key: string;
  parentKey: string | null;
  childItemId: string | null;
  code: string;
  name: string;
  itemType: string | null;
  structureType: string | null;
  supplyType: string | null;
  isSellable: boolean | null;
  quantity: number;

  /** Kullanıcının yazdığı miktar metni; ondalık girilebilmesi için saklanır. */
  quantityText?: string;

  unitOfMeasureId: string | null;
  sortOrder: number;
  error: string | null;
};

/**
 * Miktar metnini sayıya çevirir.
 *
 * Hem nokta hem virgül ondalık ayracı kabul edilir: veritabanı
 * `numeric(18, 6)` alanıdır, kullanıcı yerelde "0,5" yazabilmelidir.
 */
export function parseQuantity(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");

  if (normalized === "") {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

/** Miktarı gösterim metnine çevirir (ondalıklar korunur). */
export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

/** Kurulan ağaç. */
export type LabTree = {
  roots: LabRow[];
  childrenOf: Map<string, LabRow[]>;
};

/** Düz satır listesinden ağaç kurar. */
export function buildTree(rows: LabRow[]): LabTree {
  const childrenOf = new Map<string, LabRow[]>();
  const roots: LabRow[] = [];

  for (const row of rows) {
    if (row.parentKey === null) {
      roots.push(row);

      continue;
    }

    const list = childrenOf.get(row.parentKey) ?? [];

    list.push(row);
    childrenOf.set(row.parentKey, list);
  }

  const bySortOrder = (list: LabRow[]) => list.sort((a, b) => a.sortOrder - b.sortOrder);

  bySortOrder(roots);

  for (const list of childrenOf.values()) {
    bySortOrder(list);
  }

  return { roots, childrenOf };
}

/** Aynı üst satıra sahip kardeşler (sıraya göre). */
export function getSiblings(rows: LabRow[], parentKey: string | null): LabRow[] {
  return rows
    .filter((row) => row.parentKey === parentKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Yeni satır ekler. */
export function addRow(rows: LabRow[], parentKey: string | null, key: string): LabRow[] {
  const siblings = getSiblings(rows, parentKey);

  const sortOrder = siblings.reduce((max, sibling) => Math.max(max, sibling.sortOrder), -1) + 1;

  return [
    ...rows,
    {
      key,
      parentKey,
      childItemId: null,
      code: "",
      name: "",
      itemType: null,
      structureType: null,
      supplyType: null,
      isSellable: null,
      quantity: 1,
      unitOfMeasureId: null,
      sortOrder,
      error: null,
    },
  ];
}

/** Satırı aynı seviyede bir üstte ya da alta taşır. */
export function moveRow(rows: LabRow[], key: string, direction: "up" | "down"): LabRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row) {
    return rows;
  }

  const siblings = getSiblings(rows, row.parentKey);
  const index = siblings.findIndex((candidate) => candidate.key === key);
  const target = siblings[direction === "up" ? index - 1 : index + 1];

  if (!target) {
    return rows;
  }

  return rows.map((candidate) => {
    if (candidate.key === row.key) {
      return { ...candidate, sortOrder: target.sortOrder };
    }

    if (candidate.key === target.key) {
      return { ...candidate, sortOrder: row.sortOrder };
    }

    return candidate;
  });
}

/** Satırı bir önceki kardeşinin altına alır. */
export function indentRow(rows: LabRow[], key: string): LabRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row) {
    return rows;
  }

  const siblings = getSiblings(rows, row.parentKey);
  const index = siblings.findIndex((candidate) => candidate.key === key);
  const previous = siblings[index - 1];

  if (!previous) {
    return rows;
  }

  return rows.map((candidate) =>
    candidate.key === key ? { ...candidate, parentKey: previous.key } : candidate,
  );
}

/** Satırı bir seviye dışarı taşır. */
export function outdentRow(rows: LabRow[], key: string): LabRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row || row.parentKey === null) {
    return rows;
  }

  const parent = rows.find((candidate) => candidate.key === row.parentKey);

  if (!parent) {
    return rows;
  }

  return rows.map((candidate) =>
    candidate.key === key ? { ...candidate, parentKey: parent.parentKey } : candidate,
  );
}

/** Satırın altındaki bütün satırlar. */
export function collectDescendants(rows: LabRow[], key: string): string[] {
  const result: string[] = [];

  const walk = (parentKey: string) => {
    for (const row of rows) {
      if (row.parentKey !== parentKey) {
        continue;
      }

      result.push(row.key);
      walk(row.key);
    }
  };

  walk(key);

  return result;
}

/** Satırı ve alt dalını siler. */
export function removeSubtree(rows: LabRow[], key: string): LabRow[] {
  const removed = new Set([key, ...collectDescendants(rows, key)]);

  return rows.filter((row) => !removed.has(row.key));
}
