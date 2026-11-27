import {
  boolean,
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
import { fmeaFunctionAspect } from "./enums";
import { fmeaDocument } from "./fmea-document";
import { fmeaStructureElement } from "./fmea-structure";

/**
 * FMEA Fonksiyonu.
 *
 * AIAG–VDA adım 3 ("fonksiyon analizi") çıktısıdır. Fonksiyon bir yapı
 * elemanına bağlanır; bağlanmazsa belge seviyesinde (proses/sistem)
 * fonksiyon olarak yorumlanır.
 *
 * `processFunctionId` ile proses kütüphanesindeki bir fonksiyona bağlanabilir;
 * bağlanmazsa fonksiyon belge içinde serbest tanımlanır (ör. DFMEA ürün
 * fonksiyonları).
 */
export const fmeaFunction = pgTable(
  "fmea_function",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Bağlandığı yapı elemanı; null ise belge seviyesi fonksiyon. */
    structureElementId: uuid("structure_element_id"),

    /** Proses kütüphanesindeki karşılığı; opsiyonel. */
    processFunctionId: uuid("process_function_id"),

    name: text("name").notNull(),

    description: text("description"),

    /** Fonksiyon aspekti: amacı, girdisi, çıktısı veya kontrolü. */
    functionAspect: fmeaFunctionAspect("function_aspect").notNull().default("PURPOSE"),

    /** Fonksiyonun karşılaması gereken gereklilik. */
    requirementText: text("requirement_text"),

    /** Özel karakteristik mi? */
    isSpecialCharacteristic: boolean("is_special_characteristic").notNull().default(false),

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
    unique("fmea_function_organization_id_id_unique").on(table.organizationId, table.id),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_function_document_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.structureElementId],
      foreignColumns: [fmeaStructureElement.organizationId, fmeaStructureElement.id],
      name: "fmea_function_structure_element_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processFunctionId],
      foreignColumns: [processFunction.organizationId, processFunction.id],
      name: "fmea_function_process_function_org_fk",
    }).onDelete("no action"),

    index("fmea_function_organization_id_idx").on(table.organizationId),
    index("fmea_function_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_function_structure_element_id_idx").on(table.structureElementId),
    index("fmea_function_process_function_id_idx").on(table.processFunctionId),
  ],
);
