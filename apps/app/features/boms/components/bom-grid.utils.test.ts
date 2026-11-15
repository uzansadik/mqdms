import { describe, expect, it } from "vitest";

import {
  addRow,
  type BomGridRow,
  buildChildrenMap,
  canIndentRow,
  collectDescendantKeys,
  indentRow,
  moveRow,
  outdentRow,
  removeSubtree,
  renumberSiblings,
  toSubmissionOrder,
} from "./bom-grid.utils";

/** Test için satır üretir. */
function row(overrides: Partial<BomGridRow> = {}): BomGridRow {
  return {
    key: "a",
    parentKey: null,
    childItemId: "item-a",
    code: "100",
    name: "Gövde Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    quantity: 1,
    unitOfMeasureId: "unit-adet",
    sortOrder: 0,
    error: null,
    ...overrides,
  };
}

describe("BOM grid satır işlemleri", () => {
  it("yeni satırı seçilen üst satırın sonuna ekler", () => {
    const rows = addRow([row({ key: "a", sortOrder: 0 })], null, "new-1");

    expect(rows).toHaveLength(2);
    expect(rows[1]?.key).toBe("new-1");
    expect(rows[1]?.sortOrder).toBe(1);
    expect(rows[1]?.quantity).toBe(1);
  });

  it("yeni satıra boşluksuz olmayan kardeş sırasından sonra bir sıra verir", () => {
    const rows = addRow(
      [row({ key: "a", sortOrder: 3 }), row({ key: "b", sortOrder: 7 })],
      null,
      "new-1",
    );

    expect(rows[2]?.sortOrder).toBe(8);
  });

  it("satırı aynı seviyede bir üste taşır", () => {
    const rows = moveRow(
      [row({ key: "a", sortOrder: 0 }), row({ key: "b", sortOrder: 1 })],
      "b",
      "up",
    );

    expect(rows.find((candidate) => candidate.key === "a")?.sortOrder).toBe(1);
    expect(rows.find((candidate) => candidate.key === "b")?.sortOrder).toBe(0);
  });

  it("ilk satırı yukarı taşıyamaz", () => {
    const rows = moveRow([row({ key: "a", sortOrder: 0 })], "a", "up");

    expect(rows[0]?.sortOrder).toBe(0);
  });

  it("satırı önceki kardeşinin altına alır", () => {
    const rows = indentRow([row({ key: "a", sortOrder: 0 }), row({ key: "b", sortOrder: 1 })], "b");

    expect(rows.find((candidate) => candidate.key === "b")?.parentKey).toBe("a");
  });

  it("alt satır taşıyamayan bir kardeşin altına giremez", () => {
    const rows = indentRow(
      [row({ key: "a", structureType: "PART", sortOrder: 0 }), row({ key: "b", sortOrder: 1 })],
      "b",
    );

    expect(rows.find((candidate) => candidate.key === "b")?.parentKey).toBeNull();
    expect(canIndentRow(rows, "b")).toBe(false);
  });

  it("satırı bir seviye dışarı taşır", () => {
    const rows = outdentRow(
      [
        row({ key: "a", sortOrder: 0 }),
        row({ key: "b", parentKey: "a", sortOrder: 0 }),
        row({ key: "c", parentKey: "b", sortOrder: 0 }),
      ],
      "c",
    );

    expect(rows.find((candidate) => candidate.key === "c")?.parentKey).toBe("a");
  });

  it("alt dalıyla birlikte siler", () => {
    const rows = removeSubtree(
      [
        row({ key: "a", sortOrder: 0 }),
        row({ key: "b", parentKey: "a", sortOrder: 0 }),
        row({ key: "c", parentKey: "b", sortOrder: 0 }),
      ],
      "a",
    );

    expect(rows).toHaveLength(0);
  });

  it("alt satırları toplar", () => {
    const descendants = collectDescendantKeys(
      [
        row({ key: "a" }),
        row({ key: "b", parentKey: "a" }),
        row({ key: "c", parentKey: "b" }),
        row({ key: "d", parentKey: null }),
      ],
      "a",
    );

    expect(descendants).toEqual(["b", "c"]);
  });

  it("kardeş sıralarını sıkılaştırır", () => {
    const rows = renumberSiblings(
      [row({ key: "a", sortOrder: 5 }), row({ key: "b", sortOrder: 9 })],
      null,
    );

    expect(rows.map((candidate) => candidate.sortOrder)).toEqual([0, 1]);
  });

  it("üst satırdan aşağı doğru gönderim sırası üretir", () => {
    const ordered = toSubmissionOrder([
      row({ key: "c", parentKey: "b", sortOrder: 0 }),
      row({ key: "b", parentKey: "a", sortOrder: 0 }),
      row({ key: "a", sortOrder: 0 }),
    ]);

    expect(ordered.map((candidate) => candidate.key)).toEqual(["a", "b", "c"]);
  });
});

describe("BOM grid ağaç haritası", () => {
  it("kök altındaki satırları kök düğümünün altına koyar", () => {
    /*
     * Kök altındaki satırların üst satırı yoktur (`parentKey` null). Ağaçta
     * bunlar kök ürünün altında görünmelidir.
     */
    const map = buildChildrenMap(
      [row({ key: "a", parentKey: null }), row({ key: "b", parentKey: null, sortOrder: 1 })],
      "root",
    );

    expect(map.get("root")?.map((candidate) => candidate.key)).toEqual(["a", "b"]);
  });

  it("alt satırları üst satırına bağlar", () => {
    const map = buildChildrenMap(
      [row({ key: "a", parentKey: null }), row({ key: "b", parentKey: "a" })],
      "root",
    );

    expect(map.get("root")?.map((candidate) => candidate.key)).toEqual(["a"]);
    expect(map.get("a")?.map((candidate) => candidate.key)).toEqual(["b"]);
  });

  it("kardeşleri sıra numarasına göre sıralar", () => {
    const map = buildChildrenMap(
      [
        row({ key: "b", parentKey: null, sortOrder: 2 }),
        row({ key: "a", parentKey: null, sortOrder: 1 }),
      ],
      "root",
    );

    expect(map.get("root")?.map((candidate) => candidate.key)).toEqual(["a", "b"]);
  });
});
