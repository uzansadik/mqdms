import { describe, expect, it } from "vitest";

import { type BomLineSummary, diffBomLines } from "./comparison";

/** Karşılaştırma için satır özeti üretir. */
function line(overrides: Partial<BomLineSummary> = {}): BomLineSummary {
  return {
    lineNumber: 1,
    childItemId: "item-1",
    childItemCode: "30.0001234",
    childItemName: "Reçine A",
    childItemRevisionId: null,
    childItemRevision: null,
    childBomRevisionId: null,
    quantity: 5,
    unitOfMeasureId: "unit-kg",
    unitOfMeasureCode: "KG",
    referenceDesignation: null,
    ...overrides,
  };
}

describe("BOM revision karşılaştırması", () => {
  it("fark olmayan revision'lar için değişiklik üretmez", () => {
    const changes = diffBomLines([line()], [line()]);

    expect(changes).toHaveLength(0);
  });

  it("eklenen bileşeni ITEM_ADDED olarak bildirir", () => {
    const changes = diffBomLines([], [line({ lineNumber: 3 })]);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_ADDED");
    expect(changes[0]?.lineNumber).toBe(3);
  });

  it("kaldırılan bileşeni ITEM_REMOVED olarak bildirir", () => {
    const changes = diffBomLines([line({ lineNumber: 2 })], []);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_REMOVED");
    expect(changes[0]?.previousLineNumber).toBe(2);
  });

  it("miktar değişimini QUANTITY_CHANGED olarak bildirir", () => {
    const changes = diffBomLines([line({ quantity: 5 })], [line({ quantity: 6 })]);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("QUANTITY_CHANGED");
    expect(changes[0]?.before?.quantity).toBe(5);
    expect(changes[0]?.after?.quantity).toBe(6);
  });

  it("birim değişimini UNIT_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ unitOfMeasureId: "unit-kg", unitOfMeasureCode: "KG" })],
      [line({ unitOfMeasureId: "unit-g", unitOfMeasureCode: "G" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("UNIT_CHANGED");
  });

  it("bileşen revision değişimini ITEM_REVISION_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ childItemRevisionId: "rev-a", childItemRevision: "A" })],
      [line({ childItemRevisionId: "rev-b", childItemRevision: "B" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_REVISION_CHANGED");
  });

  it("alt BOM revision değişimini CHILD_BOM_REVISION_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ childBomRevisionId: "bom-rev-a" })],
      [line({ childBomRevisionId: "bom-rev-b" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("CHILD_BOM_REVISION_CHANGED");
  });

  it("pozisyon değişimini POSITION_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ lineNumber: 4, referenceDesignation: "A3" })],
      [line({ lineNumber: 7, referenceDesignation: "A3" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("POSITION_CHANGED");
  });

  it("aynı bileşeni iki pozisyonda karıştırmaz", () => {
    /*
     * Aynı bileşen bir BOM içinde farklı pozisyonlarda birden fazla kez
     * bulunabilir. Referans tanımı olmadan satırlar bileşen + satır numarası
     * çiftiyle eşleştirilir; iki satır birbiriyle eşleşmemelidir.
     */
    const changes = diffBomLines(
      [line({ lineNumber: 1, quantity: 5 }), line({ lineNumber: 2, quantity: 7 })],
      [line({ lineNumber: 1, quantity: 5 }), line({ lineNumber: 2, quantity: 9 })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("QUANTITY_CHANGED");
    expect(changes[0]?.lineNumber).toBe(2);
  });

  it("referans tanımı satır numarası değişse de eşleşmeyi korur", () => {
    /*
     * Tasarım referansı revision'lar arasında değişmez; satır numarası
     * değişse bile aynı bileşen eşleşir ve yalnızca pozisyon değişimi
     * bildirilir.
     */
    const changes = diffBomLines(
      [line({ lineNumber: 1, referenceDesignation: "A3" })],
      [line({ lineNumber: 9, referenceDesignation: "A3" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("POSITION_CHANGED");
  });
});
