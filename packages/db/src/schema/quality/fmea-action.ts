import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { fmeaActionStatus, fmeaActionType } from "./enums";
import { fmeaDocument } from "./fmea-document";
import { fmeaFailureCause, fmeaFailureMode } from "./fmea-failure";

/**
 * FMEA Aksiyonu.
 *
 * AIAG–VDA adım 6 ("optimizasyon") çıktısıdır. Aksiyon bir hata moduna veya
 * bir hata nedenine bağlanır; en az biri dolu olmak zorundadır.
 *
 * `isSpecialAction`, Action Priority "H" olan satırlar için özel aksiyon
 * gerektiğini işaretler: bu satırlarda aksiyon alınmıyorsa gerekçe
 * yazılmalıdır.
 */
export const fmeaAction = pgTable(
  "fmea_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Aksiyonun ait olduğu hata modu; opsiyonel. */
    failureModeId: uuid("failure_mode_id"),

    /** Aksiyonun ait olduğu hata nedeni; opsiyonel. */
    failureCauseId: uuid("failure_cause_id"),

    actionType: fmeaActionType("action_type").notNull().default("IMPROVE"),

    description: text("description").notNull(),

    /** Sorumlu kullanıcı; opsiyonel. */
    responsibleId: text("responsible_id").references(() => user.id, { onDelete: "set null" }),

    /** Sorumlunun adı (kullanıcı seçilmediyse serbest metin). */
    responsibleText: text("responsible_text"),

    /** Termin tarihi. */
    targetDate: date("target_date"),

    /** Tamamlanma tarihi. */
    completedAt: timestamp("completed_at", { withTimezone: true }),

    status: fmeaActionStatus("status").notNull().default("OPEN"),

    /** Etkinlik doğrulama açıklaması. */
    verificationOfEffectiveness: text("verification_of_effectiveness"),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedById: text("verified_by_id").references(() => user.id, { onDelete: "set null" }),

    /** Özel aksiyon mu? (Action Priority "H") */
    isSpecialAction: boolean("is_special_action").notNull().default(false),

    sortOrder: integer("sort_order").notNull().default(0),

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
    unique("fmea_action_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Aksiyon bir hata moduna ya da bir hata nedenine bağlanır.
     */
    check(
      "fmea_action_target_check",
      sql`${table.failureModeId} IS NOT NULL OR ${table.failureCauseId} IS NOT NULL`,
    ),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_action_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.failureModeId],
      foreignColumns: [fmeaFailureMode.organizationId, fmeaFailureMode.id],
      name: "fmea_action_failure_mode_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.failureCauseId],
      foreignColumns: [fmeaFailureCause.organizationId, fmeaFailureCause.id],
      name: "fmea_action_failure_cause_org_fk",
    }).onDelete("cascade"),

    index("fmea_action_organization_id_idx").on(table.organizationId),
    index("fmea_action_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_action_failure_mode_id_idx").on(table.failureModeId),
    index("fmea_action_failure_cause_id_idx").on(table.failureCauseId),
    index("fmea_action_status_idx").on(table.status),
  ],
);
