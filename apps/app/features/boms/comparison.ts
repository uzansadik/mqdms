/**
 * BOM revision karşılaştırması.
 *
 * Satırlar **lineage** ile eşleştirilir: `lineageId`, aynı occurrence'ın
 * revision'lar arasındaki kimliğidir. Satır numarası ya da stok kodu
 * eşleştirme için kullanılmaz; aynı ürün ağaçta birden fazla yerde
 * bulunabilir.
 */

/** Değişiklik tipleri. */
export type BomRevisionChangeType =
  | "ITEM_ADDED"
  | "ITEM_REMOVED"
  | "QUANTITY_CHANGED"
  | "UNIT_CHANGED"
  | "ITEM_REVISION_CHANGED"
  | "PARENT_CHANGED"
  | "REORDERED"
  | "METADATA_CHANGED";

/** Bir satırın karşılaştırma için özeti. */
export type BomLineSummary = {
  id: string;
  lineageId: string;
  parentLineageId: string | null;
  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  childItemRevisionId: string | null;
  childItemRevision: string | null;
  quantity: number;
  unitOfMeasureId: string | null;
  unitOfMeasureCode: string | null;
  referenceDesignation: string | null;
  sortOrder: number;
  path: string;
};

/** Tek bir değişiklik. */
export type BomRevisionChange = {
  type: BomRevisionChangeType;

  /** Değişiklik sonrası satırın yolu. */
  path: string | null;

  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;

  /** Değişiklik öncesi değerler. */
  before: BomLineSummary | null;

  /** Değişiklik sonrası değerler. */
  after: BomLineSummary | null;
};

/**
 * İki BOM revision'ını karşılaştırır.
 *
 * Saf fonksiyondur: eşleştirme mantığı veritabanından bağımsız test
 * edilebilir.
 */
export function diffBomLines(
  fromLines: BomLineSummary[],
  toLines: BomLineSummary[],
): BomRevisionChange[] {
  const before = new Map<string, BomLineSummary>();

  for (const line of fromLines) {
    before.set(line.lineageId, line);
  }

  const changes: BomRevisionChange[] = [];

  for (const nextLine of toLines) {
    const previousLine = before.get(nextLine.lineageId) ?? null;

    if (!previousLine) {
      changes.push({
        type: "ITEM_ADDED",
        path: nextLine.path,
        childItemId: nextLine.childItemId,
        childItemCode: nextLine.childItemCode,
        childItemName: nextLine.childItemName,
        before: null,
        after: nextLine,
      });

      continue;
    }

    if (previousLine.quantity !== nextLine.quantity) {
      changes.push(buildChange("QUANTITY_CHANGED", previousLine, nextLine));
    }

    if (previousLine.unitOfMeasureId !== nextLine.unitOfMeasureId) {
      changes.push(buildChange("UNIT_CHANGED", previousLine, nextLine));
    }

    if (previousLine.childItemRevisionId !== nextLine.childItemRevisionId) {
      changes.push(buildChange("ITEM_REVISION_CHANGED", previousLine, nextLine));
    }

    if (previousLine.parentLineageId !== nextLine.parentLineageId) {
      changes.push(buildChange("PARENT_CHANGED", previousLine, nextLine));
    }

    if (previousLine.sortOrder !== nextLine.sortOrder) {
      changes.push(buildChange("REORDERED", previousLine, nextLine));
    }

    if (
      previousLine.referenceDesignation !== nextLine.referenceDesignation ||
      previousLine.childItemId !== nextLine.childItemId
    ) {
      changes.push(buildChange("METADATA_CHANGED", previousLine, nextLine));
    }
  }

  for (const [lineageId, previousLine] of before) {
    if (toLines.some((line) => line.lineageId === lineageId)) {
      continue;
    }

    changes.push({
      type: "ITEM_REMOVED",
      path: previousLine.path,
      childItemId: previousLine.childItemId,
      childItemCode: previousLine.childItemCode,
      childItemName: previousLine.childItemName,
      before: previousLine,
      after: null,
    });
  }

  return changes.sort((a, b) => {
    const pathA = a.path ?? "";
    const pathB = b.path ?? "";

    return pathA.localeCompare(pathB, undefined, { numeric: true });
  });
}

/** Tek bir alan değişikliği için karşılaştırma kaydı üretir. */
function buildChange(
  type: BomRevisionChangeType,
  previousLine: BomLineSummary,
  nextLine: BomLineSummary,
): BomRevisionChange {
  return {
    type,
    path: nextLine.path,
    childItemId: nextLine.childItemId,
    childItemCode: nextLine.childItemCode,
    childItemName: nextLine.childItemName,
    before: previousLine,
    after: nextLine,
  };
}
