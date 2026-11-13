import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { itemType, recordStatus, supplyType } from "./enums";
import { itemGroup } from "./item-group";
import { itemUnit } from "./unit";

/**
 * Ürün kartı.
 *
 * Ürün bir **projeye değil organizasyona** aittir: aynı ürün birden fazla
 * müşteri projesinde kullanılabilir. Projeye eklerken yeni ürün kartı
 * oluşturulmaz, mevcut ürüne ilişki kurulur.
 *
 * `code` ERP'deki şirket içi ürün kodudur ve **birebir** saklanır: başındaki
 * sıfırlar, noktalar ve tireler korunur. Benzersizlik büyük/küçük harf
 * duyarsızdır, böylece "ABC" ve "abc" iki farklı ürün olmaz.
 */
export const item = pgTable(
  "item",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Şirket içi ürün kodu (ör. `30.0001234`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** Sınıflandırma grubu; eksik olabilir (taslak ürün). */
    itemGroupId: uuid("item_group_id"),

    itemType: itemType("item_type").notNull(),

    /** Varsayılan tedarik şekli; proje kapsamında override edilebilir. */
    supplyType: supplyType("supply_type"),

    unitOfMeasureId: uuid("unit_of_measure_id").notNull(),

    status: recordStatus("status").notNull().default("ACTIVE"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

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
    unique("item_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Ürün kodu organizasyon içinde unique'tir. Büyük/küçük harf duyarsız
     * karşılaştırma için `lower()` ifadesi kullanılır: kod birebir saklanır,
     * yalnızca benzersizlik kontrolü normalize edilir.
     */
    uniqueIndex("item_organization_id_code_lower_uidx").on(
      table.organizationId,
      sql`lower(${table.code})`,
    ),

    // Grup ve birim aynı organizasyona ait olmak zorundadır.
    foreignKey({
      columns: [table.organizationId, table.itemGroupId],
      foreignColumns: [itemGroup.organizationId, itemGroup.id],
      name: "item_group_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.unitOfMeasureId],
      foreignColumns: [itemUnit.organizationId, itemUnit.id],
      name: "item_unit_org_fk",
    }).onDelete("no action"),

    index("item_organization_id_idx").on(table.organizationId),
    index("item_item_group_id_idx").on(table.itemGroupId),
    index("item_unit_of_measure_id_idx").on(table.unitOfMeasureId),
    index("item_archived_at_idx").on(table.archivedAt),
  ],
);

/**
 * Ürünün harici sistem (ERP) referansı.
 *
 * mQDMS bir ERP'ye bağımlı değildir: `sourceSystem` ve `sourceInstanceKey`
 * ile farklı sistemler birbirinden ayrılır. Örnek:
 *
 * ```text
 * sourceSystem:     DINAMO
 * sourceInstanceKey: ALPIN-DINAMO
 * externalCode:      30.0001234
 * ```
 *
 * ERP'nin değişmez ID'si varsa `externalId` tercih edilir; yoksa kod üzerinden
 * eşleştirme yapılır.
 */
export const itemExternalReference = pgTable(
  "item_external_reference",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    itemId: uuid("item_id").notNull(),

    /** Harici sistemin adı (ör. `DINAMO`). */
    sourceSystem: text("source_system").notNull(),

    /** Aynı ERP'deki farklı kurulumları ayıran anahtar (ör. `ALPIN-DINAMO`). */
    sourceInstanceKey: text("source_instance_key").notNull(),

    /** Harici sistemin değişmez ID'si. */
    externalId: text("external_id"),

    /** Harici sistemdeki kod. */
    externalCode: text("external_code"),

    lastImportedAt: timestamp("last_imported_at", { withTimezone: true }),

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
    unique("item_external_reference_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Aynı source instance içindeki aynı harici kimlik birden fazla ürüne
     * bağlanamaz. Kısmi (partial) unique index: `externalId` ya da
     * `externalCode` tanımlıysa geçerlidir.
     */
    uniqueIndex("item_external_reference_identity_uidx")
      .on(table.organizationId, table.sourceInstanceKey, table.sourceSystem, table.externalId)
      .where(sql`${table.externalId} is not null`),

    uniqueIndex("item_external_reference_code_uidx")
      .on(table.organizationId, table.sourceInstanceKey, table.sourceSystem, table.externalCode)
      .where(sql`${table.externalCode} is not null`),

    /*
     * Ürün ve ERP referansı aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "item_external_reference_item_org_fk",
    }).onDelete("cascade"),

    index("item_external_reference_organization_id_idx").on(table.organizationId),
    index("item_external_reference_item_id_idx").on(table.itemId),
  ],
);

export const itemRelations = relations(item, ({ one, many }) => ({
  itemGroup: one(itemGroup, {
    fields: [item.itemGroupId],
    references: [itemGroup.id],
  }),

  unitOfMeasure: one(itemUnit, {
    fields: [item.unitOfMeasureId],
    references: [itemUnit.id],
  }),

  externalReferences: many(itemExternalReference),
}));

export const itemExternalReferenceRelations = relations(itemExternalReference, ({ one }) => ({
  item: one(item, {
    fields: [itemExternalReference.itemId],
    references: [item.id],
  }),
}));
