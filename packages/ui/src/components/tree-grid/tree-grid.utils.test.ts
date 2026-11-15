import { describe, expect, it } from "vitest";

import { findParentId, findSiblingIndex, flattenTreeRows } from "./tree-grid.utils";

/** Test için düğüm üretir. */
type Node = {
  id: string;
  children?: Node[];
};

describe("TreeGrid satır düzleştirme", () => {
  const roots: Node[] = [
    {
      id: "a",
      children: [{ id: "a-1", children: [{ id: "a-1-1" }] }, { id: "a-2" }],
    },
    { id: "b" },
  ];

  const getRowId = (row: Node) => row.id;
  const getChildren = (row: Node) => row.children;

  it("kapalı satırların altını göstermez", () => {
    const rows = flattenTreeRows(roots, { getRowId, getChildren, expanded: {} });

    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(rows[0]?.depth).toBe(0);
    expect(rows[0]?.hasChildren).toBe(true);
    expect(rows[0]?.isExpanded).toBe(false);
  });

  it("açık satırların alt satırlarını gösterir", () => {
    const rows = flattenTreeRows(roots, { getRowId, getChildren, expanded: { a: true } });

    expect(rows.map((row) => row.id)).toEqual(["a", "a-1", "a-2", "b"]);
    expect(rows[1]?.depth).toBe(1);
    expect(rows[1]?.parentId).toBe("a");
  });

  it("derin ağaçlarda derinliği doğru hesaplar", () => {
    const rows = flattenTreeRows(roots, {
      getRowId,
      getChildren,
      expanded: { a: true, "a-1": true },
    });

    const deep = rows.find((row) => row.id === "a-1-1");

    expect(deep?.depth).toBe(2);
    expect(deep?.parentId).toBe("a-1");
  });

  it("üst satır ve kardeş sırasını bulur", () => {
    const rows = flattenTreeRows(roots, { getRowId, getChildren, expanded: { a: true } });

    expect(findParentId(rows, "a-1")).toBe("a");
    expect(findParentId(rows, "a")).toBeNull();
    expect(findSiblingIndex(rows, "a-2")).toBe(1);
  });
});
