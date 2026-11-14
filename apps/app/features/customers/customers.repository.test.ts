import { describe, expect, it } from "vitest";

import { buildCustomerListQuery } from "./repository";

/**
 * Sayaç alt sorgularının korelasyonu.
 *
 * Drizzle'in tek tablo (join'siz) seçim optimizasyonu, ham SQL içindeki
 * kolon referanslarını niteliksizleştirir. Dış referans niteliksiz kalırsa
 * alt sorgu kendine referanslı hâle gelir ve sayaç daima 0 döner — hata
 * vermez, sessizce yanlış sonuç verir.
 */
describe("müşteri listesi sayaçları", () => {
  const sql = buildCustomerListQuery({ organizationId: "org-1", page: 1, pageSize: 20 }).toSQL()
    .sql;

  it("site sayacı dış müşteriye nitelikli referans verir", () => {
    expect(sql).toContain('from "customer_site"');
    expect(sql).toContain('"customer_id" = "customer"."id"');
  });

  it("aktif proje sayacı dış müşteriye nitelikli referans verir", () => {
    expect(sql).toContain('from "project"');
    expect(sql).toContain('"customer_id" = "customer"."id"');
  });

  it("kendine referanslı korelasyon kurmaz", () => {
    expect(sql).not.toMatch(/=\s*"id"/);
  });

  it("site sayacı arşivlenmemiş siteleri sayar", () => {
    expect(sql).toContain('"archived_at" is null');
  });

  it("aktif proje sayacı yalnızca ACTIVE projeleri sayar", () => {
    expect(sql).toContain("'ACTIVE'");
  });
});
