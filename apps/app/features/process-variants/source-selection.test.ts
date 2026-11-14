import { describe, expect, it } from "vitest";

import {
  defaultSelections,
  groupSelections,
  selectionKey,
  transferableChanges,
} from "./source-selection";

describe("groupSelections", () => {
  it("seçimleri kategori bazında toplar", () => {
    const grouped = groupSelections([
      { category: "WORK_ELEMENT", logicalId: "we-1" },
      { category: "WORK_ELEMENT", logicalId: "we-2" },
      { category: "REQUIREMENT", logicalId: "req-1" },
    ]);

    expect(grouped.get("WORK_ELEMENT")?.size).toBe(2);
    expect(grouped.get("REQUIREMENT")?.size).toBe(1);
    expect(grouped.get("FLOW")).toBeUndefined();
  });

  it("aynı kaydı iki kez seçerse tekilleştirir", () => {
    const grouped = groupSelections([
      { category: "FUNCTION", logicalId: "fn-1" },
      { category: "FUNCTION", logicalId: "fn-1" },
    ]);

    expect(grouped.get("FUNCTION")?.size).toBe(1);
  });
});

describe("selectionKey", () => {
  it("kategori ve mantıksal kimlikten anahtar üretir", () => {
    expect(selectionKey({ category: "FLOW", logicalId: "n-1" })).toBe("FLOW:n-1");
  });
});

describe("transferableChanges", () => {
  it("kaynakta silinmiş kayıtları aktarılabilir değişikliklerden çıkarır", () => {
    const changes = [
      {
        category: "WORK_ELEMENT" as const,
        type: "ADDED" as const,
        logicalId: "we-1",
        label: "Kumpas",
        fields: [],
        layoutOnly: false,
      },
      {
        category: "WORK_ELEMENT" as const,
        type: "REMOVED" as const,
        logicalId: "we-2",
        label: "Mikrometre",
        fields: [],
        layoutOnly: false,
      },
      {
        category: "REQUIREMENT" as const,
        type: "UPDATED" as const,
        logicalId: "req-1",
        label: "Tolerans",
        fields: ["name"],
        layoutOnly: false,
      },
    ];

    expect(transferableChanges(changes).map((change) => change.logicalId)).toEqual([
      "we-1",
      "req-1",
    ]);
  });
});

describe("defaultSelections", () => {
  it("yalnızca aktarılabilir teknik değişiklikleri seçer", () => {
    const changes = [
      {
        category: "FLOW" as const,
        type: "UPDATED" as const,
        logicalId: "n-1",
        label: "Sertifika kontrolü",
        fields: ["title"],
        layoutOnly: false,
      },
      {
        category: "FLOW" as const,
        type: "UPDATED" as const,
        logicalId: "n-2",
        label: "Kabul",
        fields: ["positionX"],
        layoutOnly: true,
      },
      {
        category: "FUNCTION" as const,
        type: "REMOVED" as const,
        logicalId: "fn-1",
        label: "Ölçüm yapmak",
        fields: [],
        layoutOnly: false,
      },
    ];

    expect(defaultSelections(changes)).toEqual(["FLOW:n-1"]);
  });
});
