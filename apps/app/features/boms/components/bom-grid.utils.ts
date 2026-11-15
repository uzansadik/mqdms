/**
 * BOM grid satır işlemleri.
 *
 * Bu modül **saf**tır: ağaç düzenleme kuralları veritabanından ve arayüzden
 * bağımsız olarak test edilebilir.
 */

/** Grid'deki tek satır. */
export type BomGridRow = {
  /** İstemci tarafındaki stabil anahtar; sunucuya bu gönderilir. */
  key: string;

  /** Üst satırın anahtarı; kök altındaki satırlarda null. */
  parentKey: string | null;

  /** Çözümlenen ürün; henüz kod girilmemişse null. */
  childItemId: string | null;

  /** Stok kodu. */
  code: string;

  /** Ürün adı. */
  name: string;

  itemType: string | null;
  structureType: string | null;
  supplyType: string | null;
  isSellable: boolean | null;

  /** Miktar; üst grubun bir birimi başınadır. */
  quantity: number;

  /** Birim; boş bırakılırsa ürünün varsayılan birimi kullanılır. */
  unitOfMeasureId: string | null;

  /** Ebeveyn içindeki sıra. */
  sortOrder: number;

  /** Satır hatası; stok kodu çözümlenemediğinde dolar. */
  error: string | null;
};

/** Bir satırın altında satır taşıyıp taşıyamayacağı. */
export function canHaveChildren(row: BomGridRow): boolean {
  return row.structureType === "ASSEMBLY" || row.structureType === "GROUP";
}

/** Bir anahtarın altındaki bütün satırlar (alt satırlar dâhil). */
export function collectDescendantKeys(rows: BomGridRow[], key: string): string[] {
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

/** Aynı üst satıra sahip kardeşler (sıraya göre). */
export function getSiblings(rows: BomGridRow[], parentKey: string | null): BomGridRow[] {
  return rows
    .filter((row) => row.parentKey === parentKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Bir grubun sıra numaralarını sıkılaştırır.
 *
 * Sıralar 0'dan başlayan boşluksuz bir diziye çevrilir: kardeş sırası
 * veritabanındaki kısmi unique index ile korunur.
 */
export function renumberSiblings(rows: BomGridRow[], parentKey: string | null): BomGridRow[] {
  const siblings = getSiblings(rows, parentKey);

  const order = new Map(siblings.map((row, index) => [row.key, index]));

  return rows.map((row) =>
    row.parentKey === parentKey && order.has(row.key)
      ? { ...row, sortOrder: order.get(row.key) as number }
      : row,
  );
}

/** Satırı aynı seviyede bir üstte ya da alta taşır. */
export function moveRow(rows: BomGridRow[], key: string, direction: "up" | "down"): BomGridRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row) {
    return rows;
  }

  const siblings = getSiblings(rows, row.parentKey);
  const index = siblings.findIndex((candidate) => candidate.key === key);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return rows;
  }

  const target = siblings[targetIndex];

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

/**
 * Satırı içeri alır: bir önceki kardeşinin altına taşır.
 *
 * Önceki kardeş alt satır taşıyamıyorsa işlem yapılmaz.
 */
export function indentRow(rows: BomGridRow[], key: string): BomGridRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row) {
    return rows;
  }

  const siblings = getSiblings(rows, row.parentKey);
  const index = siblings.findIndex((candidate) => candidate.key === key);

  if (index <= 0) {
    return rows;
  }

  const previous = siblings[index - 1];

  if (!previous || !canHaveChildren(previous)) {
    return rows;
  }

  const result = rows.map((candidate) =>
    candidate.key === key ? { ...candidate, parentKey: previous.key } : candidate,
  );

  return renumberSiblings(result, row.parentKey);
}

/**
 * Satırı bir seviye dışarı taşır.
 *
 * Satır, eski üst satırının kardeşi olur; alt satırlarıyla birlikte taşınır.
 */
export function outdentRow(rows: BomGridRow[], key: string): BomGridRow[] {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row || row.parentKey === null) {
    return rows;
  }

  const parent = rows.find((candidate) => candidate.key === row.parentKey);

  if (!parent) {
    return rows;
  }

  const result = rows.map((candidate) =>
    candidate.key === key ? { ...candidate, parentKey: parent.parentKey } : candidate,
  );

  return renumberSiblings(result, parent.parentKey);
}

/** Satır içeri alınabilir mi? (önceki kardeş alt satır taşıyabilmeli) */
export function canIndentRow(rows: BomGridRow[], key: string): boolean {
  const row = rows.find((candidate) => candidate.key === key);

  if (!row || row.parentKey === null) {
    return false;
  }

  const siblings = getSiblings(rows, row.parentKey);
  const index = siblings.findIndex((candidate) => candidate.key === key);

  if (index <= 0) {
    return false;
  }

  const previous = siblings[index - 1];

  return previous ? canHaveChildren(previous) : false;
}

/** Satır bir seviye dışarı taşınabilir mi? */
export function canOutdentRow(rows: BomGridRow[], key: string): boolean {
  const row = rows.find((candidate) => candidate.key === key);

  return Boolean(row && row.parentKey !== null);
}

/** Satırı ve altındaki bütün satırları siler. */
export function removeSubtree(rows: BomGridRow[], key: string): BomGridRow[] {
  const removed = new Set([key, ...collectDescendantKeys(rows, key)]);

  return renumberSiblings(
    rows.filter((row) => !removed.has(row.key)),
    rows.find((row) => row.key === key)?.parentKey ?? null,
  );
}

/**
 * Yeni satır ekler.
 *
 * @param level Ekleme yapılacak seviye: null ise kök altı.
 */
export function addRow(rows: BomGridRow[], parentKey: string | null, key: string): BomGridRow[] {
  const siblings = getSiblings(rows, parentKey);

  const row: BomGridRow = {
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
    sortOrder: siblings.length,
    error: null,
  };

  return [...rows, row];
}

/** Ağaçtaki satırları sıralı düz listeye çevirir (kaydetme sırası). */
export function toSubmissionOrder(rows: BomGridRow[]): BomGridRow[] {
  const result: BomGridRow[] = [];

  const walk = (parentKey: string | null) => {
    for (const row of getSiblings(rows, parentKey)) {
      result.push(row);
      walk(row.key);
    }
  };

  walk(null);

  /*
   * Döngüsel bir ağaç oluşmuşsa (istemci hatası) kalan satırlar sona
   * eklenir; hiçbir satır kaybolmaz.
   */
  if (result.length !== rows.length) {
    for (const row of rows) {
      if (!result.some((candidate) => candidate.key === row.key)) {
        result.push(row);
      }
    }
  }

  return result;
}
