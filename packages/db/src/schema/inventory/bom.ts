import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { bomRevisionStatus, bomType, joiningMethod, recordStatus } from "./enums";
import { item } from "./item";
import { itemRevision } from "./item-revision";
import { itemUnit } from "./unit";

/**
 * Ürünün bileşen yapısı (BOM başlığı).
 *
 * Bir BOM'un sahibi bir **Item**'dır. Bir item birden fazla BOM tanımına
 * sahip olabilir; hangisinin kullanılacağı tahmin edilmez, kullanım yerinde
 * açıkça seçilir (bkz. `project_item.bom_revision_id`).
 */
export const bom = pgTable(
  "bom",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** BOM'un sahibi olan ürün. */
    itemId: uuid("item_id").notNull(),

    /** Kısa tanımlayıcı; organizasyon içinde unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    bomType: bomType("bom_type").notNull().default("MANUFACTURING"),

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
    unique("bom_organization_id_id_unique").on(table.organizationId, table.id),

    uniqueIndex("bom_organization_id_code_uidx").on(table.organizationId, table.code),

    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "bom_item_org_fk",
    }).onDelete("cascade"),

    index("bom_organization_id_idx").on(table.organizationId),
    index("bom_item_id_idx").on(table.itemId),
    index("bom_archived_at_idx").on(table.archivedAt),
  ],
);

/**
 * BOM'un belirli bir sürümü.
 *
 * BOM revision ile item revision birbirinden bağımsızdır; ancak BOM
 * revision, ilgili item'ın teknik revision'ıyla ilişkilendirilebilir.
 *
 * `RELEASED` içerik doğrudan değiştirilemez; yeni değişiklik `DRAFT`
 * revision üzerinde yapılır. ERP'den yeni veri gelmesi önceki yayınlanmış
 * BOM'u değiştirmez.
 */
export const bomRevision = pgTable(
  "bom_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    bomId: uuid("bom_id").notNull(),

    /** BOM'un sahibi item'ın teknik revision'ı; opsiyoneldir. */
    parentItemRevisionId: uuid("parent_item_revision_id"),

    /** Revision değeri (ör. `05`). */
    revision: text("revision").notNull(),

    description: text("description"),

    changeReason: text("change_reason"),

    status: bomRevisionStatus("status").notNull().default("DRAFT"),

    effectiveFrom: date("effective_from"),

    /** Verinin kaynaklandığı sistem (ör. `DINAMO`). */
    sourceSystem: text("source_system"),

    /** Kaynak sistemdeki revision değeri. */
    sourceRevision: text("source_revision"),

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

    releasedAt: timestamp("released_at", { withTimezone: true }),

    releasedById: text("released_by_id").references(() => user.id, { onDelete: "set null" }),

    /** Bu revision'ın yerini alan önceki revision. */
    supersedesRevisionId: uuid("supersedes_revision_id"),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("bom_revision_organization_id_id_unique").on(table.organizationId, table.id),

    // Revision değeri aynı BOM altında unique'tir.
    uniqueIndex("bom_revision_bom_id_revision_uidx").on(table.bomId, table.revision),

    foreignKey({
      columns: [table.organizationId, table.bomId],
      foreignColumns: [bom.organizationId, bom.id],
      name: "bom_revision_bom_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.parentItemRevisionId],
      foreignColumns: [itemRevision.organizationId, itemRevision.id],
      name: "bom_revision_item_revision_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.supersedesRevisionId],
      foreignColumns: [table.organizationId, table.id],
      name: "bom_revision_supersedes_org_fk",
    }).onDelete("no action"),

    index("bom_revision_organization_id_idx").on(table.organizationId),
    index("bom_revision_bom_id_idx").on(table.bomId),
    index("bom_revision_status_idx").on(table.status),
  ],
);

/**
 * BOM satırı.
 *
 * Aynı item bir BOM içinde **farklı pozisyonlarda birden fazla kez**
 * bulunabilir; bu yüzden `child_item_id` üzerinde unique constraint yoktur.
 * Satırlar `line_number` ile ayırt edilir.
 *
 * `child_bom_revision_id` opsiyoneldir: alt BOM'u olmayan bir bileşen de
 * geçerlidir. Yayınlanmış bir BOM'da alt BOM referansı her zaman belirli bir
 * revision'a bağlıdır — "en son revision" otomatik kullanılmaz.
 */
export const bomLine = pgTable(
  "bom_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    bomRevisionId: uuid("bom_revision_id").notNull(),

    /** Bileşen ürün. */
    childItemId: uuid("child_item_id").notNull(),

    /** Bileşenin belirli bir teknik revision'ı; opsiyoneldir. */
    childItemRevisionId: uuid("child_item_revision_id"),

    /** Bileşenin kendi BOM revision'ı; opsiyoneldir. */
    childBomRevisionId: uuid("child_bom_revision_id"),

    /** BOM içindeki sıra numarası. */
    lineNumber: integer("line_number").notNull(),

    /** Miktar. `numeric` kullanılır, floating point değil. */
    quantity: numeric("quantity", { precision: 18, scale: 6, mode: "number" }).notNull(),

    /** Miktar birimi; bileşenin kendi birimi varsayılan olarak kullanılır. */
    unitOfMeasureId: uuid("unit_of_measure_id"),

    description: text("description"),

    /** Referans tanımı (ör. `A3`, `12-B`). */
    referenceDesignation: text("reference_designation"),

    sortOrder: integer("sort_order").notNull().default(0),

    /** Bileşenlerin birleştirilme yöntemi. */
    joiningMethod: joiningMethod("joining_method"),

    notes: text("notes"),

    /** Montaj pozisyon referansı. */
    positionReference: text("position_reference"),

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
    unique("bom_line_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Satırlar line number ile ayırt edilir. `child_item_id` üzerinde unique
     * **yoktur**: aynı bileşen farklı pozisyonlarda birden fazla kez
     * bulunabilir.
     */
    uniqueIndex("bom_line_bom_revision_id_line_number_uidx").on(
      table.bomRevisionId,
      table.lineNumber,
    ),

    // Miktar sıfırdan büyük olmalıdır.
    check("bom_line_quantity_check", sql`${table.quantity} > 0`),

    foreignKey({
      columns: [table.organizationId, table.bomRevisionId],
      foreignColumns: [bomRevision.organizationId, bomRevision.id],
      name: "bom_line_bom_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.childItemId],
      foreignColumns: [item.organizationId, item.id],
      name: "bom_line_child_item_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.childItemRevisionId],
      foreignColumns: [itemRevision.organizationId, itemRevision.id],
      name: "bom_line_child_item_revision_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.childBomRevisionId],
      foreignColumns: [bomRevision.organizationId, bomRevision.id],
      name: "bom_line_child_bom_revision_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.unitOfMeasureId],
      foreignColumns: [itemUnit.organizationId, itemUnit.id],
      name: "bom_line_unit_org_fk",
    }).onDelete("no action"),

    index("bom_line_organization_id_idx").on(table.organizationId),
    index("bom_line_bom_revision_id_idx").on(table.bomRevisionId),
    index("bom_line_child_item_id_idx").on(table.childItemId),
  ],
);

export const bomRelations = relations(bom, ({ one, many }) => ({
  item: one(item, {
    fields: [bom.itemId],
    references: [item.id],
  }),

  revisions: many(bomRevision),
}));

export const bomRevisionRelations = relations(bomRevision, ({ one, many }) => ({
  bom: one(bom, {
    fields: [bomRevision.bomId],
    references: [bom.id],
  }),

  lines: many(bomLine),
}));

export const bomLineRelations = relations(bomLine, ({ one }) => ({
  bomRevision: one(bomRevision, {
    fields: [bomLine.bomRevisionId],
    references: [bomRevision.id],
  }),

  childItem: one(item, {
    fields: [bomLine.childItemId],
    references: [item.id],
  }),
}));
