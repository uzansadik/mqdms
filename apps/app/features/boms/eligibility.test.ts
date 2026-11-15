import { describe, expect, it } from "vitest";

import {
  canHaveChildren,
  checkChildEligibility,
  checkParentEligibility,
  checkRootEligibility,
  type ItemClassification,
} from "./eligibility";

/** Test için ürün üretir. */
function item(overrides: Partial<ItemClassification> = {}): ItemClassification {
  return {
    id: "item-1",
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

describe("BOM kökü uygunluğu", () => {
  it("satılabilir üretilen mamulü kabul eder", () => {
    expect(checkRootEligibility(item()).ok).toBe(true);
  });

  it("satın alınan satılabilir mamulü kabul eder", () => {
    expect(checkRootEligibility(item({ supplyType: "PURCHASED" })).ok).toBe(true);
  });

  it("satılamayan ürünü reddeder", () => {
    const result = checkRootEligibility(item({ isSellable: false }));

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("satılabilir");
  });

  it("mamul olmayan ürünü reddeder", () => {
    const result = checkRootEligibility(item({ itemType: "COMPONENT" }));

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("mamul");
  });

  it("tedarik şekli belirsiz ürünü reddeder", () => {
    const result = checkRootEligibility(item({ supplyType: "UNKNOWN" }));

    expect(result.ok).toBe(false);
  });

  it("pasif ürünü reddeder", () => {
    expect(checkRootEligibility(item({ status: "INACTIVE" })).ok).toBe(false);
  });

  it("arşivlenmiş ürünü reddeder", () => {
    expect(checkRootEligibility(item({ archivedAt: new Date() })).ok).toBe(false);
  });
});

describe("Üst satır uygunluğu", () => {
  it("montaj ve grup niteliğini kabul eder", () => {
    expect(
      checkParentEligibility(item({ itemType: "COMPONENT", structureType: "ASSEMBLY" })).ok,
    ).toBe(true);

    expect(checkParentEligibility(item({ itemType: "COMPONENT", structureType: "GROUP" })).ok).toBe(
      true,
    );
  });

  it("parça niteliğini reddeder", () => {
    const result = checkParentEligibility(item({ itemType: "COMPONENT", structureType: "PART" }));

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("Parça");
  });

  it("ham madde ve sarfı reddeder", () => {
    expect(
      checkParentEligibility(item({ itemType: "RAW_MATERIAL", structureType: "GROUP" })).ok,
    ).toBe(false);

    expect(
      checkParentEligibility(item({ itemType: "CONSUMABLE", structureType: "GROUP" })).ok,
    ).toBe(false);
  });

  it("parent olabilirliği özetler", () => {
    expect(canHaveChildren(item({ structureType: "GROUP" }))).toBe(true);
    expect(canHaveChildren(item({ structureType: "PART" }))).toBe(false);
  });
});

describe("Alt satır uygunluğu", () => {
  it("kök altındaki ham maddeyi reddeder", () => {
    const result = checkChildEligibility(item({ itemType: "RAW_MATERIAL" }), 1);

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("doğrudan ana ürünün altında");
  });

  it("daha derindeki ham maddeyi kabul eder", () => {
    expect(checkChildEligibility(item({ itemType: "RAW_MATERIAL" }), 2).ok).toBe(true);
  });

  it("satın alınan bileşeni kök altında kabul eder", () => {
    expect(
      checkChildEligibility(
        item({ itemType: "COMPONENT", structureType: "PART", supplyType: "PURCHASED" }),
        1,
      ).ok,
    ).toBe(true);
  });
});
