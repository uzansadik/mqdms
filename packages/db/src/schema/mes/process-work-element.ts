import {
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
import { itemGroup } from "../inventory/item-group";
import { workElementCategory } from "./enums";
import { flowNode } from "./flow-node";
import { processVariantRevision } from "./process-variant-revision";

/**
 * Process Work Element.
 *
 * AIAG–VDA PFMEA yapısında ve fonksiyon analizinde kullanılan gerçek proses
 * unsurudur: operatör, kumpas, reçine, kontrol ortamı.
 *
 * Work Element, Flow Node'dan **bağımsız** bir entity'dir; ikisi
 * many-to-many ilişkiyle bağlanır.
 *
 * `logicalId` aynı teknik kaydın revision'lar boyunca stabil kimliğidir,
 * `derivedFromId` ise kaydın doğrudan türetildiği satırı gösterir.
 */
export const processWorkElement = pgTable(
  "process_work_element",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu Process Variant Revision. */
    processVariantRevisionId: uuid("process_variant_revision_id").notNull(),

    /** Revision'lar boyunca stabil teknik kimlik. */
    logicalId: text("logical_id").notNull(),

    /** Doğrudan türetildiği kaynak kaydın id'si. */
    derivedFromId: uuid("derived_from_id"),

    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** AIAG–VDA 4M kategorisi. */
    category: workElementCategory("category").notNull(),

    /** `MATERIAL` kategorisi için isteğe bağlı item referansı. */
    itemId: uuid("item_id"),

    /** `MATERIAL` kategorisi için isteğe bağlı item grup referansı. */
    itemGroupId: uuid("item_group_id"),

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
    unique("process_work_element_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı revision içinde logical id unique'tir.
    unique("process_work_element_revision_id_logical_id_unique").on(
      table.processVariantRevisionId,
      table.logicalId,
    ),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_work_element_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_work_element_derived_from_org_fk",
    }).onDelete("no action"),

    /*
     * Item ve Item Group referansları aynı organizasyona ait olmak
     * zorundadır; başka organizasyonun kaydına bağlanılamaz.
     */
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "process_work_element_item_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.itemGroupId],
      foreignColumns: [itemGroup.organizationId, itemGroup.id],
      name: "process_work_element_item_group_org_fk",
    }).onDelete("no action"),

    index("process_work_element_organization_id_idx").on(table.organizationId),
    index("process_work_element_revision_id_idx").on(table.processVariantRevisionId),
    index("process_work_element_category_idx").on(table.category),
    index("process_work_element_derived_from_id_idx").on(table.derivedFromId),
  ],
);

/**
 * Flow Node ↔ Process Work Element ilişkisi.
 *
 * Bir node birden fazla work element ile, bir work element birden fazla node
 * ile ilişkilendirilebilir. İlişkilendirilen kayıtlar aynı teknik revision
 * kapsamına ait olmalıdır; bu kural servis katmanında doğrulanır.
 */
export const flowNodeWorkElement = pgTable(
  "flow_node_work_element",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    flowNodeId: uuid("flow_node_id").notNull(),

    processWorkElementId: uuid("process_work_element_id").notNull(),

    description: text("description"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("flow_node_work_element_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı node-work element çifti iki kez eklenemez.
    unique("flow_node_work_element_node_id_work_element_id_unique").on(
      table.flowNodeId,
      table.processWorkElementId,
    ),

    foreignKey({
      columns: [table.organizationId, table.flowNodeId],
      foreignColumns: [flowNode.organizationId, flowNode.id],
      name: "flow_node_work_element_node_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processWorkElementId],
      foreignColumns: [processWorkElement.organizationId, processWorkElement.id],
      name: "flow_node_work_element_work_element_org_fk",
    }).onDelete("cascade"),

    index("flow_node_work_element_organization_id_idx").on(table.organizationId),
    index("flow_node_work_element_flow_node_id_idx").on(table.flowNodeId),
    index("flow_node_work_element_work_element_id_idx").on(table.processWorkElementId),
  ],
);
