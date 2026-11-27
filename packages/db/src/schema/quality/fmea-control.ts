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
import { processFunction } from "../mes/process-function";
import { fmeaControlEffectiveness, fmeaControlType } from "./enums";
import { fmeaDocument } from "./fmea-document";
import { fmeaFailureCause } from "./fmea-failure";

/**
 * FMEA Kontrolü (önleme / algılama).
 *
 * AIAG–VDA'da her hata nedeni için iki ayrı kontrol tanımlanır:
 *
 * - `PREVENTION`: nedenin oluşmasını engelleyen mevcut kontrol.
 * - `DETECTION`: hatanın oluşması hâlinde saptanmasını sağlayan kontrol.
 *
 * Önleme kontrolünün etkinliği doğrudan **O** puanına, algılama
 * kontrolünün etkinliği doğrudan **D** puanına yansır.
 *
 * Neden başına en fazla bir önleme ve bir algılama kontrolü bulunabilir.
 */
export const fmeaControl = pgTable(
  "fmea_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Kontrolün ait olduğu hata nedeni. */
    failureCauseId: uuid("failure_cause_id").notNull(),

    controlType: fmeaControlType("control_type").notNull(),

    description: text("description").notNull(),

    /** Kontrolün etkinlik derecesi. */
    effectiveness: fmeaControlEffectiveness("effectiveness").notNull(),

    /** Kontrolü yürüten proses fonksiyonu; opsiyonel. */
    processFunctionId: uuid("process_function_id"),

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
    unique("fmea_control_organization_id_id_unique").on(table.organizationId, table.id),

    // Neden başına en fazla bir önleme ve bir algılama kontrolü.
    unique("fmea_control_failure_cause_id_control_type_unique").on(
      table.failureCauseId,
      table.controlType,
    ),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_control_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.failureCauseId],
      foreignColumns: [fmeaFailureCause.organizationId, fmeaFailureCause.id],
      name: "fmea_control_failure_cause_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processFunctionId],
      foreignColumns: [processFunction.organizationId, processFunction.id],
      name: "fmea_control_process_function_org_fk",
    }).onDelete("no action"),

    index("fmea_control_organization_id_idx").on(table.organizationId),
    index("fmea_control_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_control_failure_cause_id_idx").on(table.failureCauseId),
  ],
);
