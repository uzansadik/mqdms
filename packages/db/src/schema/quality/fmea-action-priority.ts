import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization } from "../initial/auth";
import { fmeaActionPriorityMethod } from "./enums";

/**
 * FMEA Action Priority Matrisi.
 *
 * AIAG & VDA FMEA Handbook (2019) Action Priority tablosu **bant hâlinde**
 * yayımlanmıştır: şiddet, oluşma ve algılama dereceleri gruplara ayrılır ve
 * her grup çifti için tek bir H/M/L değeri tanımlıdır.
 *
 * Bu tablo organizasyona aittir: el kitabı **ücretli** bir yayındır ve
 * müşterinin kopyasındaki değerler kurum tarafından doğrulanıp buraya
 * girilir. Varsayılan matris `apps/app/features/fmea/rating.ts` içinde
 * sürümlenmiş hâliyle tutulur ve kurumda kayıt yoksa seed edilir.
 */
export const fmeaActionPriority = pgTable(
  "fmea_action_priority",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Hesaplama yöntemi. */
    method: fmeaActionPriorityMethod("method").notNull().default("ACTION_PRIORITY"),

    /** Şiddet bandının alt sınırı (dahil). */
    severityMin: integer("severity_min").notNull(),

    /** Şiddet bandının üst sınırı (dahil). */
    severityMax: integer("severity_max").notNull(),

    /** Oluşma bandının alt sınırı (dahil). */
    occurrenceMin: integer("occurrence_min").notNull(),

    /** Oluşma bandının üst sınırı (dahil). */
    occurrenceMax: integer("occurrence_max").notNull(),

    /** Algılama bandının alt sınırı (dahil). */
    detectionMin: integer("detection_min").notNull(),

    /** Algılama bandının üst sınırı (dahil). */
    detectionMax: integer("detection_max").notNull(),

    /** Öncelik: H / M / L. */
    actionPriority: text("action_priority").notNull(),

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
    unique("fmea_action_priority_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı bant üçlüsü iki kez tanımlanamaz.
    unique("fmea_action_priority_organization_id_bands_unique").on(
      table.organizationId,
      table.method,
      table.severityMin,
      table.severityMax,
      table.occurrenceMin,
      table.occurrenceMax,
      table.detectionMin,
      table.detectionMax,
    ),

    /*
     * Organizasyon referansı açıkça da verilir: matris satırları yalnızca
     * kendi organizasyonuna aittir.
     */
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "fmea_action_priority_organization_fk",
    }).onDelete("cascade"),

    index("fmea_action_priority_organization_id_idx").on(table.organizationId),
    index("fmea_action_priority_method_idx").on(table.method),
  ],
);
