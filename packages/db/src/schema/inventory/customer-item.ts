import { relations, sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { customer } from "../crm/customer";
import { organization } from "../initial/auth";
import { recordStatus, revisionStatus } from "./enums";
import { item } from "./item";
import { itemRevision } from "./item-revision";

/**
 * Müşteri ürün referansı.
 *
 * Şirket içi ürün kodu ile müşteri parça numarası **bağımsız** yönetilir:
 * aynı ürünün farklı müşterilerde farklı parça numaraları olabilir, aynı
 * parça numarası farklı müşterilerde kullanılabilir.
 *
 * `scope`, müşterinin aynı parça numarasını farklı kapsamlarda (tesis,
 * katalog) kullandığı durumu açıkça tanımlamak içindir. Kapsamı olmayan
 * kayıtlar için boş string kullanılır.
 */
export const customerItem = pgTable(
  "customer_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    customerId: uuid("customer_id").notNull(),

    itemId: uuid("item_id").notNull(),

    /** Müşterinin kendi parça numarası (ör. `DTRF-100123`). */
    customerPartNumber: text("customer_part_number").notNull(),

    /** Müşterinin kullandığı parça adı. */
    customerPartName: text("customer_part_name"),

    description: text("description"),

    /** Kapsam (tesis, katalog); kapsamsız kayıtlar için boş string. */
    scope: text("scope").notNull().default(""),

    status: recordStatus("status").notNull().default("ACTIVE"),

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

    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("customer_item_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Müşteri parça numarası müşteri kapsamında unique'tir. Büyük/küçük harf
     * duyarsız karşılaştırma uygulanır.
     */
    uniqueIndex("customer_item_customer_part_number_uidx").on(
      table.customerId,
      sql`lower(${table.customerPartNumber})`,
      table.scope,
    ),

    /*
     * Müşteri, ürün ve referans aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customer.organizationId, customer.id],
      name: "customer_item_customer_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "customer_item_item_org_fk",
    }).onDelete("cascade"),

    index("customer_item_organization_id_idx").on(table.organizationId),
    index("customer_item_customer_id_idx").on(table.customerId),
    index("customer_item_item_id_idx").on(table.itemId),
    index("customer_item_archived_at_idx").on(table.archivedAt),
  ],
);

/**
 * Müşteri revision eşleştirmesi.
 *
 * Müşteri teknik resim revizyonu, müşteri ürün revizyonu ve iç ürün revizyonu
 * gerektiğinde ayrı ayrı saklanır; zorunlu bir birebir eşitlik yoktur.
 *
 * `internalItemRevisionId` taslakta opsiyoneldir. Eşleştirme yapıldığında
 * revision'ın ilgili müşteri ürününün **ürününe** ait olması servis
 * katmanında doğrulanır.
 */
export const customerItemRevision = pgTable(
  "customer_item_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    customerItemId: uuid("customer_item_id").notNull(),

    /** Müşterinin kendi revision değeri (ör. `C`). */
    customerRevision: text("customer_revision").notNull(),

    /** Eşleşen iç ürün revision'ı. */
    internalItemRevisionId: uuid("internal_item_revision_id"),

    /** Müşteri teknik resmi referansı. */
    drawingReference: text("drawing_reference"),

    /** Müşteri resminin revision'ı. */
    drawingRevision: text("drawing_revision"),

    description: text("description"),

    status: revisionStatus("status").notNull().default("DRAFT"),

    effectiveFrom: date("effective_from"),

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
    unique("customer_item_revision_organization_id_id_unique").on(table.organizationId, table.id),

    // Müşteri revision değeri müşteri ürünü içinde unique'tir.
    uniqueIndex("customer_item_revision_customer_item_id_customer_revision_uidx").on(
      table.customerItemId,
      table.customerRevision,
    ),

    foreignKey({
      columns: [table.organizationId, table.customerItemId],
      foreignColumns: [customerItem.organizationId, customerItem.id],
      name: "customer_item_revision_customer_item_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.internalItemRevisionId],
      foreignColumns: [itemRevision.organizationId, itemRevision.id],
      name: "customer_item_revision_item_revision_org_fk",
    }).onDelete("no action"),

    index("customer_item_revision_organization_id_idx").on(table.organizationId),
    index("customer_item_revision_customer_item_id_idx").on(table.customerItemId),
    index("customer_item_revision_internal_item_revision_id_idx").on(table.internalItemRevisionId),
  ],
);

export const customerItemRelations = relations(customerItem, ({ one, many }) => ({
  customer: one(customer, {
    fields: [customerItem.customerId],
    references: [customer.id],
  }),

  item: one(item, {
    fields: [customerItem.itemId],
    references: [item.id],
  }),

  revisions: many(customerItemRevision),
}));

export const customerItemRevisionRelations = relations(customerItemRevision, ({ one }) => ({
  customerItem: one(customerItem, {
    fields: [customerItemRevision.customerItemId],
    references: [customerItem.id],
  }),

  internalItemRevision: one(itemRevision, {
    fields: [customerItemRevision.internalItemRevisionId],
    references: [itemRevision.id],
  }),
}));
