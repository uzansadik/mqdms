import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { recordStatus } from "./enums";

/**
 * Ürün ve malzeme sınıflandırma grubu.
 *
 * Sabit bir enum değil, organizasyonun kendi hiyerarşisini yönettiği bir
 * yapıdır. Örnek hiyerarşi:
 *
 * ```text
 * RAW_MATERIAL
 *   CHEMICAL
 *     RESIN
 *     GELCOAT
 *   REINFORCEMENT
 *     GLASS_FIBER
 * METAL
 *   BRACKET
 * ```
 *
 * Döngüsel ilişkiler (bir grubun kendi alt grubunun parent'ı olması) servis
 * katmanında engellenir.
 */
export const itemGroup = pgTable(
  "item_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Üst grup; kök gruplarda boştur. */
    parentId: uuid("parent_id"),

    /** Kısa tanımlayıcı (ör. `CHEMICAL`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** Aynı seviyedeki gruplar arasındaki sıralama. */
    sortOrder: integer("sort_order").notNull().default(0),

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
    unique("item_group_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı grup kodu iki kez kullanılamaz.
    uniqueIndex("item_group_organization_id_code_uidx").on(table.organizationId, table.code),

    /*
     * Üst grup aynı organizasyona ait olmak zorundadır. `no action` seçildi:
     * alt grupları olan bir grubun silinmesi engellenir, owner önce alt
     * grupları taşımak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.parentId],
      foreignColumns: [table.organizationId, table.id],
      name: "item_group_parent_org_fk",
    }).onDelete("no action"),

    index("item_group_organization_id_idx").on(table.organizationId),
    index("item_group_parent_id_idx").on(table.parentId),
    index("item_group_archived_at_idx").on(table.archivedAt),
  ],
);

export const itemGroupRelations = relations(itemGroup, ({ one, many }) => ({
  parent: one(itemGroup, {
    fields: [itemGroup.parentId],
    references: [itemGroup.id],
    relationName: "itemGroupParent",
  }),

  children: many(itemGroup, { relationName: "itemGroupParent" }),
}));

/*
 * Gruba ait ürünler (`item.group_id -> item_group.id`) bilinçli olarak burada
 * tanımlanmaz: `item` modülü zaten bu dosyayı içe aktarıyor ve ters yönlü
 * ilişki iki dosya arasında döngüsel import oluşturur.
 */
