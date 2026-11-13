import { relations } from "drizzle-orm";
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

import { organization, user } from "../initial/auth";
import { revisionStatus } from "./enums";
import { item } from "./item";

/**
 * Ürünün teknik revizyonu.
 *
 * Ürün kartı ile teknik sürüm ayrı kavramlardır: bir ürün kartı revision
 * bilgisi olmadan açılabilir, ancak yayınlanmış teknik yapılarda kullanılan
 * ürünün revizyonu açıkça belirlenmelidir.
 *
 * `RELEASED` revision teknik içerik olarak değiştirilemez; yeni bir teknik
 * değişiklik için yeni revision oluşturulur ve önceki revision silinmez.
 *
 * Revision değeri **metin** olarak saklanır: sayısal artış zorunlu değildir.
 */
export const itemRevision = pgTable(
  "item_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    itemId: uuid("item_id").notNull(),

    /** Revision değeri (ör. `03`, `C`, `2024-1`). */
    revision: text("revision").notNull(),

    description: text("description"),

    /** Değişikliğin sebebi. */
    changeReason: text("change_reason"),

    status: revisionStatus("status").notNull().default("DRAFT"),

    /** Revision'ın kaynaklandığı belge (resim, ERP kaydı). */
    sourceReference: text("source_reference"),

    /** Yürürlük tarihi. */
    effectiveFrom: date("effective_from"),

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

    /** Yayınlanma zamanı. */
    releasedAt: timestamp("released_at", { withTimezone: true }),

    releasedById: text("released_by_id").references(() => user.id, { onDelete: "set null" }),

    /** Bu revision'ın yerini alan önceki revision. */
    supersedesRevisionId: uuid("supersedes_revision_id"),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("item_revision_organization_id_id_unique").on(table.organizationId, table.id),

    // Revision değeri aynı ürün içinde unique'tir.
    uniqueIndex("item_revision_item_id_revision_uidx").on(table.itemId, table.revision),

    /*
     * Revision ve ürün aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "item_revision_item_org_fk",
    }).onDelete("cascade"),

    /*
     * Supersede ilişkisi de aynı organizasyon içinde kalmalıdır.
     */
    foreignKey({
      columns: [table.organizationId, table.supersedesRevisionId],
      foreignColumns: [table.organizationId, table.id],
      name: "item_revision_supersedes_org_fk",
    }).onDelete("no action"),

    index("item_revision_organization_id_idx").on(table.organizationId),
    index("item_revision_item_id_idx").on(table.itemId),
    index("item_revision_status_idx").on(table.status),
  ],
);

export const itemRevisionRelations = relations(itemRevision, ({ one }) => ({
  item: one(item, {
    fields: [itemRevision.itemId],
    references: [item.id],
  }),
}));
