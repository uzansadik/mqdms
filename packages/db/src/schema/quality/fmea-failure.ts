import { sql } from "drizzle-orm";
import {
  check,
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
import { processWorkElement } from "../mes/process-work-element";
import { fmeaCauseCategory, fmeaSeverityClassification } from "./enums";
import { fmeaDocument } from "./fmea-document";
import { fmeaFunction } from "./fmea-function";
import { fmeaStructureElement } from "./fmea-structure";

/**
 * FMEA Hata Modu (Failure Mode).
 *
 * AIAG–VDA adım 4'ün "hata etkisi" ve "hata modu" sütunlarını taşır.
 * Etkiler iki ayrı alanda tutulur:
 *
 * - `failureEffectLocal`: hatanın doğduğu yerdeki etkisi.
 * - `failureEffectEnd`: sistemin sonundaki (ürün/müşteri) etkisi.
 *
 * `severity` bu etkilerden türetilir; `severityClassification` ise VDA'nın
 * "S-Klassifizierung" değeridir (SC1 / SC2) ve özel karakteristik adayını
 * gösterir.
 */
export const fmeaFailureMode = pgTable(
  "fmea_failure_mode",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Hatanın oluştuğu yapı elemanı. */
    structureElementId: uuid("structure_element_id").notNull(),

    /** Hatanın etkilediği fonksiyon; opsiyonel. */
    functionId: uuid("function_id"),

    /** Hata modu. */
    failureMode: text("failure_mode").notNull(),

    /** Yerel hata etkisi. */
    failureEffectLocal: text("failure_effect_local"),

    /** Son (müşteriye ulaşan) hata etkisi. */
    failureEffectEnd: text("failure_effect_end"),

    /** Şiddet (1–10). */
    severity: integer("severity").notNull(),

    /** VDA şiddet sınıflandırması. */
    severityClassification: fmeaSeverityClassification("severity_classification")
      .notNull()
      .default("NONE"),

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
    unique("fmea_failure_mode_organization_id_id_unique").on(table.organizationId, table.id),

    // Şiddet 1–10 aralığında olmalıdır.
    check("fmea_failure_mode_severity_check", sql`${table.severity} between 1 and 10`),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_failure_mode_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.structureElementId],
      foreignColumns: [fmeaStructureElement.organizationId, fmeaStructureElement.id],
      name: "fmea_failure_mode_structure_element_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.functionId],
      foreignColumns: [fmeaFunction.organizationId, fmeaFunction.id],
      name: "fmea_failure_mode_function_org_fk",
    }).onDelete("cascade"),

    index("fmea_failure_mode_organization_id_idx").on(table.organizationId),
    index("fmea_failure_mode_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_failure_mode_structure_element_id_idx").on(table.structureElementId),
    index("fmea_failure_mode_function_id_idx").on(table.functionId),
  ],
);

/**
 * FMEA Hata Nedeni (Failure Cause).
 *
 * Hata modunun neden oluştuğunu açıklar. `occurrence` (O) nedenin
 * gerçekleşme sıklığı, `detection` (D) ise mevcut algılama kontrolünün
 * başarı derecesidir.
 *
 * Bir hata modunun birden fazla nedeni olabilir; her neden kendi satırıdır.
 */
export const fmeaFailureCause = pgTable(
  "fmea_failure_cause",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Nedenin ait olduğu hata modu. */
    failureModeId: uuid("failure_mode_id").notNull(),

    /** Hata nedeni. */
    cause: text("cause").notNull(),

    /** Neden kategorisi (4M ve ötesi). */
    causeCategory: fmeaCauseCategory("cause_category").notNull().default("OTHER"),

    /** Bağlandığı 4M iş unsuru; opsiyonel. */
    processWorkElementId: uuid("process_work_element_id"),

    /** Bağlandığı proses fonksiyonu; opsiyonel. */
    processFunctionId: uuid("process_function_id"),

    /** Oluşma sıklığı (1–10). */
    occurrence: integer("occurrence").notNull(),

    /** Algılama derecesi (1–10). */
    detection: integer("detection").notNull(),

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
    unique("fmea_failure_cause_organization_id_id_unique").on(table.organizationId, table.id),

    // O ve D 1–10 aralığında olmalıdır.
    check("fmea_failure_cause_occurrence_check", sql`${table.occurrence} between 1 and 10`),
    check("fmea_failure_cause_detection_check", sql`${table.detection} between 1 and 10`),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_failure_cause_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.failureModeId],
      foreignColumns: [fmeaFailureMode.organizationId, fmeaFailureMode.id],
      name: "fmea_failure_cause_failure_mode_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processWorkElementId],
      foreignColumns: [processWorkElement.organizationId, processWorkElement.id],
      name: "fmea_failure_cause_work_element_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.processFunctionId],
      foreignColumns: [processFunction.organizationId, processFunction.id],
      name: "fmea_failure_cause_process_function_org_fk",
    }).onDelete("no action"),

    index("fmea_failure_cause_organization_id_idx").on(table.organizationId),
    index("fmea_failure_cause_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_failure_cause_failure_mode_id_idx").on(table.failureModeId),
    index("fmea_failure_cause_cause_category_idx").on(table.causeCategory),
  ],
);
