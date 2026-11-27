import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { organization } from "../initial/auth";
import { fmeaRiskMethod } from "./enums";

/**
 * FMEA Risk Matrisi.
 *
 * VDA'nın risk sınıflandırması (A / B / C) **şiddet × oluşma** çiftine
 * göre verilir; algılama derecesi bu sınıflandırmaya girmez.
 *
 * Sınırlar kurum tarafından belirlenir: tablo, organizasyonun elindeki VDA
 * kopyasına göre kalibre edilebilir. Yeni organizasyonlara varsayılan
 * matris seed edilir (yalnızca organizasyonda kayıt yoksa).
 */
export const fmeaRiskMatrix = pgTable(
  "fmea_risk_matrix",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Sınıflandırma yöntemi. */
    method: fmeaRiskMethod("method").notNull().default("RISK_CLASS"),

    /** Şiddet (1–10). */
    severity: integer("severity").notNull(),

    /** Oluşma (1–10). */
    occurrence: integer("occurrence").notNull(),

    /** Risk sınıfı: A / B / C. */
    riskClass: text("risk_class").notNull(),

    /** Risk önceliği etiketi; matris hücresinin serbest açıklaması. */
    riskPriority: text("risk_priority"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("fmea_risk_matrix_organization_id_id_unique").on(table.organizationId, table.id),

    // Organizasyon başına her (S, O) çiftinde tek sınıf.
    unique("fmea_risk_matrix_organization_id_severity_occurrence_unique").on(
      table.organizationId,
      table.severity,
      table.occurrence,
    ),

    index("fmea_risk_matrix_organization_id_idx").on(table.organizationId),
    index("fmea_risk_matrix_method_idx").on(table.method),
  ],
);
