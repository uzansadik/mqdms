import { describe, expect, it } from "vitest";

import type { ItemClassification } from "./eligibility";
import {
  type BomTreeLine,
  buildBomTree,
  flattenBomTree,
  formatRevisionLabel,
  multiplyQuantities,
  validateBomTree,
} from "./tree";

/** Test için satır üretir. */
function line(overrides: Partial<BomTreeLine> = {}): BomTreeLine {
  return {
    id: "line-1",
    parentLineId: null,
    lineageId: "lineage-1",
    lineNumber: 1,
    sortOrder: 0,
    quantity: 1,
    unitOfMeasureId: "unit-adet",
    childItemId: "item-1",
    childItemRevisionId: null,
    childItemRevision: null,
    referenceDesignation: null,
    joiningMethod: null,
    description: null,
    notes: null,
    positionReference: null,
    childItemCode: "100",
    childItemName: "Gövde Grubu",
    childItemType: "COMPONENT",
    childItemStructureType: "GROUP",
    childItemSupplyType: "MANUFACTURED",
    childItemIsSellable: false,
    childItemUnitOfMeasureId: "unit-adet",
    childItemStatus: "ACTIVE",
    childItemArchivedAt: null,
    unitOfMeasureCode: "Adet",
    ...overrides,
  };
}

/** Test için kök ürün üretir. */
function rootItem(overrides: Partial<ItemClassification> = {}): ItemClassification {
  return {
    id: "root",
    code: "001",
    name: "Elektrikli Bisiklet",
    itemType: "FINISHED_GOOD",
    structureType: "ASSEMBLY",
    supplyType: "MANUFACTURED",
    isSellable: true,
    status: "ACTIVE",
    archivedAt: null,
    unitOfMeasureId: "unit-adet",
    ...overrides,
  };
}

describe("revision etiketi", () => {
  it("iki haneli numarayı sıfırla doldurur", () => {
    expect(formatRevisionLabel(1)).toBe("REV.01");
    expect(formatRevisionLabel(9)).toBe("REV.09");
    expect(formatRevisionLabel(10)).toBe("REV.10");
  });

  it("yüzden büyük numaraları değiştirmeden gösterir", () => {
    expect(formatRevisionLabel(100)).toBe("REV.100");
    expect(formatRevisionLabel(101)).toBe("REV.101");
  });
});

describe("BOM ağacı kurulumu", () => {
  it("hiyerarşiyi kurar ve derinlik ile yol hesaplar", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", sortOrder: 0 }),
      line({ id: "b", lineageId: "lb", parentLineId: "a", sortOrder: 0 }),
      line({ id: "c", lineageId: "lc", parentLineId: "b", sortOrder: 0 }),
    ]);

    expect(tree.issues).toHaveLength(0);
    expect(tree.roots).toHaveLength(1);

    const root = tree.roots[0];

    expect(root?.depth).toBe(1);
    expect(root?.path).toBe("1");

    const child = root?.children[0];

    expect(child?.depth).toBe(2);
    expect(child?.path).toBe("1.1");

    expect(child?.children[0]?.depth).toBe(3);
    expect(child?.children[0]?.path).toBe("1.1.1");
  });

  it("kardeşleri sıra numarasına göre sıralar", () => {
    const tree = buildBomTree([
      line({ id: "b", lineageId: "lb", sortOrder: 1 }),
      line({ id: "a", lineageId: "la", sortOrder: 0 }),
    ]);

    expect(tree.roots.map((node) => node.line.id)).toEqual(["a", "b"]);
  });

  it("kendi üst satırını gösteren satırı yetim sayar", () => {
    const tree = buildBomTree([line({ id: "a", parentLineId: "a" })]);

    expect(tree.issues.some((issue) => issue.type === "SELF_PARENT")).toBe(true);
  });

  it("bulunmayan üst satırı yetim olarak bildirir", () => {
    const tree = buildBomTree([line({ id: "a", parentLineId: "yok" })]);

    expect(tree.issues.some((issue) => issue.type === "ORPHAN")).toBe(true);
  });

  it("döngüyü tespit eder", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", parentLineId: "b" }),
      line({ id: "b", lineageId: "lb", parentLineId: "a" }),
    ]);

    expect(tree.issues.some((issue) => issue.type === "CYCLE")).toBe(true);
  });
});

describe("BOM düzleştirme", () => {
  it("üst grupların miktarlarını çarpar", () => {
    /*
     * Bisiklet örneği: 2 braket grubu, her birinde 4 adet M10 cıvata.
     * Bir bisiklet için toplam 8 cıvata gerekir.
     */
    const tree = buildBomTree([
      line({ id: "grup", lineageId: "lg", quantity: 2, childItemId: "item-grup" }),
      line({
        id: "civata",
        lineageId: "lc",
        parentLineId: "grup",
        quantity: 4,
        childItemId: "item-civata",
        childItemCode: "M10",
      }),
    ]);

    const flattened = flattenBomTree(tree);

    expect(flattened).toHaveLength(1);
    expect(flattened[0]?.quantity).toBe(8);
  });

  it("yaprakları toplar, ara grupları hariç tutar", () => {
    const tree = buildBomTree([
      line({ id: "grup", lineageId: "lg", quantity: 1, childItemId: "item-grup" }),
      line({
        id: "civata",
        lineageId: "lc",
        parentLineId: "grup",
        quantity: 4,
        childItemId: "item-civata",
      }),
    ]);

    const leaves = flattenBomTree(tree);
    const all = flattenBomTree(tree, { includeIntermediate: true });

    expect(leaves).toHaveLength(1);
    expect(all).toHaveLength(2);
  });

  it("farklı birimleri tek satırda birleştirmez", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", unitOfMeasureId: "unit-kg" }),
      line({ id: "b", lineageId: "lb", unitOfMeasureId: "unit-g" }),
    ]);

    expect(flattenBomTree(tree)).toHaveLength(2);
  });

  it("miktar çarpımında ondalık hassasiyeti korur", () => {
    expect(multiplyQuantities(0.1, 0.2)).toBe(0.02);
    expect(multiplyQuantities(1.5, 4)).toBe(6);
    expect(multiplyQuantities(2.5, 0.2)).toBe(0.5);
  });
});

describe("BOM ağacı doğrulaması", () => {
  it("satılabilir mamul kökünü kabul eder", () => {
    const tree = buildBomTree([line({ childItemType: "COMPONENT" })]);

    expect(validateBomTree(tree, rootItem()).ok).toBe(true);
  });

  it("ham maddeyi kök altında reddeder", () => {
    const tree = buildBomTree([line({ id: "a", lineageId: "la", childItemType: "RAW_MATERIAL" })]);

    const result = validateBomTree(tree, rootItem());

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("doğrudan ana ürünün altında");
  });

  it("derin seviyedeki ham maddeyi kabul eder", () => {
    const tree = buildBomTree([
      line({ id: "grup", lineageId: "lg", childItemId: "item-grup" }),
      line({
        id: "hammadde",
        lineageId: "lm",
        parentLineId: "grup",
        childItemId: "item-hammadde",
        childItemType: "RAW_MATERIAL",
      }),
    ]);

    expect(validateBomTree(tree, rootItem()).ok).toBe(true);
  });

  it("alt satır taşıyan parçayı reddeder", () => {
    const tree = buildBomTree([
      line({ id: "parca", lineageId: "lp", childItemStructureType: "PART" }),
      line({ id: "alt", lineageId: "la", parentLineId: "parca" }),
    ]);

    const result = validateBomTree(tree, rootItem());

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Parça niteliğindeki");
  });

  it("kök ürünün kendi BOM'unda bileşen olarak kullanılmasını reddeder", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", childItemId: "root", childItemCode: "001" }),
    ]);

    const result = validateBomTree(tree, rootItem());

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("kendi BOM'unda bileşen");
  });

  it("ata zincirinde tekrarlanan ürünü reddeder", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", childItemCode: "100" }),
      line({ id: "b", lineageId: "lb", parentLineId: "a", childItemCode: "100" }),
    ]);

    const result = validateBomTree(tree, rootItem());

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("üst satır zincirinde tekrar");
  });

  it("pasif ürünü reddeder", () => {
    const tree = buildBomTree([line({ id: "a", lineageId: "la", childItemStatus: "INACTIVE" })]);

    expect(validateBomTree(tree, rootItem()).ok).toBe(false);
  });

  it("aynı seviyede tekrarlanan sırayı reddeder", () => {
    const tree = buildBomTree([
      line({ id: "a", lineageId: "la", sortOrder: 0, childItemId: "item-a" }),
      line({ id: "b", lineageId: "lb", sortOrder: 0, childItemId: "item-b" }),
    ]);

    const result = validateBomTree(tree, rootItem());

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("sıra numaraları farklı olmalıdır");
  });
});
