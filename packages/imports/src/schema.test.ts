import { describe, expect, it } from "vitest";

import { columnMappingSchema, importFields, requiredImportFields } from "./schema";

describe("columnMappingSchema", () => {
  it("eşleştirilmemiş alanları eler", () => {
    /*
     * "Eşleştirilmedi" seçimi boş değer üretir; boş değerler eşleştirmeye
     * girmemelidir, aksi halde tüm doğrulama kilitlenir.
     */
    const result = columnMappingSchema.parse({ code: "Kod", name: "", unit: "Birim" });

    expect(result).toEqual({ code: "Kod", unit: "Birim" });
  });

  it("tamamen boş eşleştirmeyi kabul eder", () => {
    const result = columnMappingSchema.parse({ code: "", name: "" });

    expect(result).toEqual({});
  });

  it("alan adı boş olamaz", () => {
    const result = columnMappingSchema.safeParse({ "": "Kod" });

    expect(result.success).toBe(false);
  });
});

describe("import alanları", () => {
  it("zorunlu alanlar hedef alanlar arasındadır", () => {
    for (const [importType, required] of Object.entries(requiredImportFields)) {
      const fields = importFields[importType as keyof typeof importFields];

      for (const field of required) {
        expect(fields).toContain(field);
      }
    }
  });
});
