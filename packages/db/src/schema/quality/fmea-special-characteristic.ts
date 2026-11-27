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
import { fmeaCharacteristicStatus, fmeaCharacteristicType } from "./enums";
import { fmeaDocument } from "./fmea-document";
import { fmeaFailureMode } from "./fmea-failure";
import { fmeaFunction } from "./fmea-function";
import { fmeaStructureElement } from "./fmea-structure";

/**
 * FMEA Özel Karakteristiği.
 *
 * AIAG–VDA'da özel karakteristikler (pE / pS) ayrıca işaretlenir ve
 * gerekçesi yazılır. Bu kayıt gerekçeyi ve durumu tutar; işaretin kendisi
 * ilgili satırda (`is_special_characteristic`, `severity_classification`)
 * da görünür.
 *
 * Karakteristik bir yapı elemanına, bir fonksiyona veya bir hata moduna
 * bağlanır; en az biri dolu olmak zorundadır.
 */
export const fmeaSpecialCharacteristic = pgTable(
  "fmea_special_characteristic",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Karakteristiğin ait olduğu yapı elemanı; opsiyonel. */
    structureElementId: uuid("structure_element_id"),

    /** Karakteristiğin ait olduğu fonksiyon; opsiyonel. */
    functionId: uuid("function_id"),

    /** Karakteristiğin ait olduğu hata modu; opsiyonel. */
    failureModeId: uuid("failure_mode_id"),

    /** pE (ürün) veya pS (proses) özel karakteristiği. */
    characteristicType: fmeaCharacteristicType("characteristic_type").notNull(),

    /** VDA sınıflandırması: SC1 / SC2. */
    scClass: text("sc_class"),

    /** Karakteristiğin işaretlenme gerekçesi (VDA'daki "R"). */
    reason: text("reason"),

    status: fmeaCharacteristicStatus("status").notNull().default("OPEN"),

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
    unique("fmea_special_characteristic_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),

    /*
     * Karakteristik en az bir hedefe bağlanmalıdır.
     */
    check(
      "fmea_special_characteristic_target_check",
      sql`${table.structureElementId} IS NOT NULL OR ${table.functionId} IS NOT NULL OR ${table.failureModeId} IS NOT NULL`,
    ),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_special_characteristic_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.structureElementId],
      foreignColumns: [fmeaStructureElement.organizationId, fmeaStructureElement.id],
      name: "fmea_special_characteristic_structure_element_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.functionId],
      foreignColumns: [fmeaFunction.organizationId, fmeaFunction.id],
      name: "fmea_special_characteristic_function_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.failureModeId],
      foreignColumns: [fmeaFailureMode.organizationId, fmeaFailureMode.id],
      name: "fmea_special_characteristic_failure_mode_org_fk",
    }).onDelete("cascade"),

    index("fmea_special_characteristic_organization_id_idx").on(table.organizationId),
    index("fmea_special_characteristic_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_special_characteristic_status_idx").on(table.status),
  ],
);
