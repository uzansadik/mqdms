import { describe, expect, it } from "vitest";

import { buildPlantListQuery } from "./repository";

/**
 * Proje sayacının korelasyonu.
 *
 * Drizzle'in tek tablo (join'siz) seçim optimizasyonu, ham SQL içindeki
 * kolon referanslarını niteliksizleştirir. Dış referans niteliksiz kalırsa
 * alt sorgu kendine referanslı hâle gelir ve sayaç daima 0 döner — hata
 * vermez, sessizce yanlış sonuç verir.
 */
describe("tesis listesi proje sayacı", () => {
  const sql = buildPlantListQuery({ organizationId: "org-1", page: 1, pageSize: 20 }).toSQL().sql;

  it("dış tesise nitelikli referans verir", () => {
    expect(sql).toContain('"plant"."id"');
  });

  it("kendine referanslı korelasyon kurmaz", () => {
    expect(sql).not.toMatch(/=\s*"id"/);
  });

  it("yalnızca ACTIVE ve arşivlenmemiş projeleri sayar", () => {
    expect(sql).toContain('"project"."status" = \'ACTIVE\'');
    expect(sql).toContain('"project"."archived_at" is null');
  });
});
