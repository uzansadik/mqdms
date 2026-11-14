import { describe, expect, it } from "vitest";

import { normalizeHeader, suggestMapping } from "./mapping";

describe("normalizeHeader", () => {
  it("büyük/küçük harf, boşluk ve ayraçları yok sayar", () => {
    expect(normalizeHeader("Ürün Kodu")).toBe("urunkodu");
    expect(normalizeHeader("ürün_kodu")).toBe("urunkodu");
    expect(normalizeHeader("  ÜRÜN KODU ")).toBe("urunkodu");
  });

  it("türkçe harfleri ASCII karşılıklarına çevirir", () => {
    expect(normalizeHeader("Çapraz")).toBe("capraz");
    expect(normalizeHeader("Şişe")).toBe("sise");
    expect(normalizeHeader("İsim")).toBe("isim");
  });
});

describe("suggestMapping", () => {
  it("birebir ad eşleşmesini bulur", () => {
    const mapping = suggestMapping(["code", "name"], ["code", "name"]);

    expect(mapping).toEqual({ code: "code", name: "name" });
  });

  it("türkçe başlıkları takma ad üzerinden eşler", () => {
    const mapping = suggestMapping(["code", "name", "unit"], ["Ürün Kodu", "Ürün Adı", "Birim"]);

    expect(mapping).toEqual({
      code: "Ürün Kodu",
      name: "Ürün Adı",
      unit: "Birim",
    });
  });

  it("eşleşmeyen alanları atlar", () => {
    const mapping = suggestMapping(["code", "erpReference"], ["Kod", "Bilinmeyen"]);

    expect(mapping).toEqual({ code: "Kod" });
  });

  it("bir başlığı iki alana eşlemez", () => {
    const mapping = suggestMapping(["code", "itemCode"], ["Kod"]);

    expect(Object.values(mapping)).toEqual(["Kod"]);
  });

  it("eşleştirme önerisi boşsa boş döner", () => {
    expect(suggestMapping(["code"], ["A", "B"])).toEqual({});
  });
});
