/**
 * BOM revision karşılaştırması.
 *
 * İki revision arasındaki farkı satır bazında çıkarır. Satırlar **stabil bir
 * kimlikle** eşleştirilir: referans tanımı (ör. `A3`) varsa o kullanılır,
 * yoksa bileşen ve satır numarası çifti kullanılır. Aynı bileşen bir BOM
 * içinde farklı pozisyonlarda birden fazla kez bulunabildiği için yalnızca
 * bileşene bakmak yanlış eşleşme üretir.
 */

/** Değişiklik tipleri. */
export type BomRevisionChangeType =
  | "ITEM_ADDED"
  | "ITEM_REMOVED"
  | "QUANTITY_CHANGED"
  | "UNIT_CHANGED"
  | "ITEM_REVISION_CHANGED"
  | "CHILD_BOM_REVISION_CHANGED"
  | "POSITION_CHANGED";

/** Bir satırın karşılaştırma için özeti. */
export type BomLineSummary = {
  lineNumber: number;
  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  childItemRevisionId: string | null;
  childItemRevision: string | null;
  childBomRevisionId: string | null;
  quantity: number;
  unitOfMeasureId: string | null;
  unitOfMeasureCode: string | null;
  referenceDesignation: string | null;
};

/** Tek bir değişiklik. */
export type BomRevisionChange = {
  type: BomRevisionChangeType;

  /** Yeni revision'daki satır numarası; kaldırılan satırlarda null. */
  lineNumber: number | null;

  /** Önceki revision'daki satır numarası; eklenen satırlarda null. */
  previousLineNumber: number | null;

  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  referenceDesignation: string | null;

  /** Değişiklik öncesi değerler. */
  before: BomLineSummary | null;

  /** Değişiklik sonrası değerler. */
  after: BomLineSummary | null;
};

/**
 * Satır için stabil eşleştirme anahtarı.
 *
 * Referans tanımı varsa o kullanılır: tasarım referansı revision'lar arasında
 * değişmez. Yoksa bileşen ve satır numarası çifti kullanılır.
 */
function lineMatchKey(line: BomLineSummary): string {
  const reference = line.referenceDesignation?.trim();

  if (reference) {
    return `ref:${reference}`;
  }

  return `pos:${line.childItemId}:${line.lineNumber}`;
}

/**
 * İki BOM revision'ını karşılaştırır.
 *
 * @param organizationId karşılaştırmanın kapsandığı organizasyon.
 * @param fromRevisionId önceki revision.
 * @param toRevisionId yeni revision.
 */
/**
 * İki satır listesinin farkını çıkarır.
 *
 * Saf fonksiyondur: eşleştirme mantığı veritabanından bağımsız test
 * edilebilir.
 */
export function diffBomLines(
  fromLines: BomLineSummary[],
  toLines: BomLineSummary[],
): BomRevisionChange[] {
  const before = new Map<string, BomLineSummary>();
  const after = new Map<string, BomLineSummary>();

  for (const line of fromLines) {
    before.set(lineMatchKey(line), line);
  }

  for (const line of toLines) {
    after.set(lineMatchKey(line), line);
  }

  const changes: BomRevisionChange[] = [];

  for (const [key, nextLine] of after) {
    const previousLine = before.get(key) ?? null;

    if (!previousLine) {
      changes.push({
        type: "ITEM_ADDED",
        lineNumber: nextLine.lineNumber,
        previousLineNumber: null,
        childItemId: nextLine.childItemId,
        childItemCode: nextLine.childItemCode,
        childItemName: nextLine.childItemName,
        referenceDesignation: nextLine.referenceDesignation,
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

    if (previousLine.childBomRevisionId !== nextLine.childBomRevisionId) {
      changes.push(buildChange("CHILD_BOM_REVISION_CHANGED", previousLine, nextLine));
    }

    if (previousLine.lineNumber !== nextLine.lineNumber) {
      changes.push(buildChange("POSITION_CHANGED", previousLine, nextLine));
    }
  }

  for (const [key, previousLine] of before) {
    if (after.has(key)) {
      continue;
    }

    changes.push({
      type: "ITEM_REMOVED",
      lineNumber: null,
      previousLineNumber: previousLine.lineNumber,
      childItemId: previousLine.childItemId,
      childItemCode: previousLine.childItemCode,
      childItemName: previousLine.childItemName,
      referenceDesignation: previousLine.referenceDesignation,
      before: previousLine,
      after: null,
    });
  }

  return changes.sort((a, b) => {
    const lineA = a.lineNumber ?? a.previousLineNumber ?? 0;
    const lineB = b.lineNumber ?? b.previousLineNumber ?? 0;

    return lineA - lineB;
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
    lineNumber: nextLine.lineNumber,
    previousLineNumber: previousLine.lineNumber,
    childItemId: nextLine.childItemId,
    childItemCode: nextLine.childItemCode,
    childItemName: nextLine.childItemName,
    referenceDesignation: nextLine.referenceDesignation,
    before: previousLine,
    after: nextLine,
  };
}
