import { sql } from "drizzle-orm";
import {
  boolean,
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
import { item } from "../inventory/item";
import { flowNode } from "../mes/flow-node";
import { processWorkElement } from "../mes/process-work-element";
import { fmeaStructureLevel } from "./enums";
import { fmeaDocument } from "./fmea-document";

/**
 * FMEA Sistem Yapısı Elemanı.
 *
 * AIAG–VDA adım 2 ("yapı analizi") çıktısıdır: sistem → alt sistem →
 * bileşen hiyerarşisi.
 *
 * Yapı elemanı **proses kütüphanesinden türetilebilir** ama bağımsız bir
 * kayıttır: `flowNodeId` (PFMEA faaliyet), `itemId` (DFMEA ürün) veya
 * `processWorkElementId` (4M iş unsuru) referanslarından **en fazla biri**
 * dolar. Bu ayrım, kurumun kendi yapısını da analiz edebilmesini sağlar.
 */
export const fmeaStructureElement = pgTable(
  "fmea_structure_element",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu FMEA belgesi. */
    fmeaDocumentId: uuid("fmea_document_id").notNull(),

    /** Üst yapı elemanı; null ise eleman kök seviyededir. */
    parentId: uuid("parent_id"),

    level: fmeaStructureLevel("level").notNull().default("COMPONENT"),

    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** PFMEA: akış faaliyeti. */
    flowNodeId: uuid("flow_node_id"),

    /** DFMEA: ürün. */
    itemId: uuid("item_id"),

    /** PFMEA: 4M iş unsuru. */
    processWorkElementId: uuid("process_work_element_id"),

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
    unique("fmea_structure_element_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Üst eleman ilişkisinin FK hedefi: üst eleman aynı belgede olmak
     * zorundadır.
     */
    unique("fmea_structure_element_organization_id_document_id_id_unique").on(
      table.organizationId,
      table.fmeaDocumentId,
      table.id,
    ),

    // Eleman kendi üst elemanı olamaz.
    check(
      "fmea_structure_element_parent_not_self_check",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),

    /*
     * Kaynak referanslarından en fazla biri dolar: bir eleman hem akış
     * faaliyeti hem ürün olamaz.
     */
    check(
      "fmea_structure_element_single_source_check",
      sql`((${table.flowNodeId} IS NOT NULL)::int + (${table.itemId} IS NOT NULL)::int + (${table.processWorkElementId} IS NOT NULL)::int) <= 1`,
    ),

    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId],
      foreignColumns: [fmeaDocument.organizationId, fmeaDocument.id],
      name: "fmea_structure_element_document_org_fk",
    }).onDelete("cascade"),

    /*
     * Üst eleman silinmeden önce alt elemanlar açıkça silinmelidir: sessiz
     * cascade edilmez.
     */
    foreignKey({
      columns: [table.organizationId, table.fmeaDocumentId, table.parentId],
      foreignColumns: [table.organizationId, table.fmeaDocumentId, table.id],
      name: "fmea_structure_element_parent_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.flowNodeId],
      foreignColumns: [flowNode.organizationId, flowNode.id],
      name: "fmea_structure_element_flow_node_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "fmea_structure_element_item_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.processWorkElementId],
      foreignColumns: [processWorkElement.organizationId, processWorkElement.id],
      name: "fmea_structure_element_work_element_org_fk",
    }).onDelete("no action"),

    index("fmea_structure_element_organization_id_idx").on(table.organizationId),
    index("fmea_structure_element_document_id_idx").on(table.fmeaDocumentId),
    index("fmea_structure_element_parent_id_idx").on(table.parentId),
    index("fmea_structure_element_flow_node_id_idx").on(table.flowNodeId),
    index("fmea_structure_element_item_id_idx").on(table.itemId),
  ],
);
