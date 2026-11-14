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
import { item } from "../inventory/item";
import { itemGroup } from "../inventory/item-group";
import { processIoDirection, processIoResourceType } from "./enums";
import { processVariantRevision } from "./process-variant-revision";

/**
 * Process Input / Output tanımı.
 *
 * Prosesin girdileri ve çıktıları **isteğe bağlıdır**: her proses
 * adımından sonra yeni bir item veya yarı mamul oluşturmak zorunlu değildir.
 * Tanım yalnızca açıklayıcıdır; stok hareketi üretmez.
 */
export const processIoDefinition = pgTable(
  "process_io_definition",
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

    direction: processIoDirection("direction").notNull(),

    resourceType: processIoResourceType("resource_type").notNull().default("MATERIAL"),

    name: text("name").notNull(),

    description: text("description"),

    /** İsteğe bağlı item grup referansı. */
    itemGroupId: uuid("item_group_id"),

    /** İsteğe bağlı item referansı. */
    itemId: uuid("item_id"),

    /** Proses durumu; zorunlu değildir. */
    processState: text("process_state"),

    isRequired: boolean("is_required").notNull().default(false),

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
    unique("process_io_definition_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı revision içinde logical id unique'tir.
    unique("process_io_definition_revision_id_logical_id_unique").on(
      table.processVariantRevisionId,
      table.logicalId,
    ),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_io_definition_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_io_definition_derived_from_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [item.organizationId, item.id],
      name: "process_io_definition_item_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.itemGroupId],
      foreignColumns: [itemGroup.organizationId, itemGroup.id],
      name: "process_io_definition_item_group_org_fk",
    }).onDelete("no action"),

    index("process_io_definition_organization_id_idx").on(table.organizationId),
    index("process_io_definition_revision_id_idx").on(table.processVariantRevisionId),
    index("process_io_definition_direction_idx").on(table.direction),
  ],
);
