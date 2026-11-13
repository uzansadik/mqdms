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
import { project } from "../pms/project";
import { bomRevision } from "./bom";
import { customerItem, customerItemRevision } from "./customer-item";
import { projectItemRole, recordStatus, supplyType } from "./enums";
import { item } from "./item";
import { itemRevision } from "./item-revision";

/**
 * Proje kapsamındaki ürün kullanımı.
 *
 * Organizasyonun ortak item kartı, bir müşteri projesinde nasıl
 * kullanılıyorsa. Projeye item eklemek **yeni item kartı oluşturmaz**;
 * mevcut item'a ilişki kurulur.
 *
 * `DELIVERABLE` işaretli bir satır BOM zorunluluğu oluşturmaz; alt
 * bileşenlerin tamamı elle Project Item olarak yönetilmek zorunda değildir.
 */
export const projectItem = pgTable(
  "project_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    projectId: uuid("project_id").notNull(),

    itemId: uuid("item_id").notNull(),

    /** Kullanılan item'ın belirli bir teknik revision'ı. */
    itemRevisionId: uuid("item_revision_id"),

    /** Müşteri parça numarası eşleştirmesi. */
    customerItemId: uuid("customer_item_id"),

    /** Müşteri revision eşleştirmesi. */
    customerItemRevisionId: uuid("customer_item_revision_id"),

    /** Kullanılan BOM revision'ı. */
    bomRevisionId: uuid("bom_revision_id"),

    itemRole: projectItemRole("item_role").notNull().default("COMPONENT"),

    /** Bu proje kapsamındaki tedarik şekli override'ı. */
    supplyTypeOverride: supplyType("supply_type_override"),

    description: text("description"),

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
    unique("project_item_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Aynı **aktif** item projeye iki kez eklenemez. Kısmi (partial) unique
     * index: arşivlenen satırlar tekrar eklenebilir.
     */
    uniqueIndex("project_item_project_id_item_id_uidx")
      .on(table.projectId, table.itemId)
      .where(sql`${table.archivedAt} is null`),

    /*
     * Proje, item ve eşleştirmeler aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [project.organizationId, project.id],
      name: "project_item_project_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "project_item_item_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.itemRevisionId],
      foreignColumns: [itemRevision.organizationId, itemRevision.id],
      name: "project_item_item_revision_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.customerItemId],
      foreignColumns: [customerItem.organizationId, customerItem.id],
      name: "project_item_customer_item_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.customerItemRevisionId],
      foreignColumns: [customerItemRevision.organizationId, customerItemRevision.id],
      name: "project_item_customer_item_revision_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.bomRevisionId],
      foreignColumns: [bomRevision.organizationId, bomRevision.id],
      name: "project_item_bom_revision_org_fk",
    }).onDelete("no action"),

    index("project_item_organization_id_idx").on(table.organizationId),
    index("project_item_project_id_idx").on(table.projectId),
    index("project_item_item_id_idx").on(table.itemId),
    index("project_item_archived_at_idx").on(table.archivedAt),
  ],
);

export const projectItemRelations = relations(projectItem, ({ one }) => ({
  project: one(project, {
    fields: [projectItem.projectId],
    references: [project.id],
  }),

  item: one(item, {
    fields: [projectItem.itemId],
    references: [item.id],
  }),
}));
