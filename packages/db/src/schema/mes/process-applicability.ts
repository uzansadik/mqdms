import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization } from "../initial/auth";
import { joiningMethod, supplyType } from "../inventory/enums";
import { itemGroup } from "../inventory/item-group";
import { processVariantRevision } from "./process-variant-revision";

/**
 * Process Variant Applicability.
 *
 * Varyantın hangi malzeme ve üretim koşullarında uygulanabilir olduğunu
 * tanımlar. Phase 4'teki proses öneri mekanizmasının veri temelidir.
 *
 * `supplyType` ve `joiningMethod` envanter alanının mevcut enum'larıdır;
 * yeniden oluşturulmaz. Bilinmeyen tedarik şekli otomatik olarak `PURCHASED`
 * kabul edilmez.
 */
export const processVariantApplicability = pgTable(
  "process_variant_applicability",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu Process Variant Revision. */
    processVariantRevisionId: uuid("process_variant_revision_id").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** Tedarik şekli koşulu. */
    supplyType: supplyType("supply_type"),

    /** Birleştirme yöntemi koşulu (ör. `BONDING`). */
    joiningMethod: joiningMethod("joining_method"),

    isActive: boolean("is_active").notNull().default(true),

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
    unique("process_variant_applicability_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_variant_applicability_revision_org_fk",
    }).onDelete("cascade"),

    index("process_variant_applicability_organization_id_idx").on(table.organizationId),
    index("process_variant_applicability_revision_id_idx").on(table.processVariantRevisionId),
  ],
);

/**
 * Applicability kapsamındaki item grupları.
 *
 * Bir kural birden fazla item grubu kapsayabilir; alt grupların dahil
 * edilip edilmediği ayrıca tanımlanır.
 */
export const processVariantApplicabilityItemGroup = pgTable(
  "process_variant_applicability_item_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    applicabilityId: uuid("applicability_id").notNull(),

    itemGroupId: uuid("item_group_id").notNull(),

    /** Alt gruplar da kapsama dahil mi? */
    includeDescendants: boolean("include_descendants").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("process_variant_applicability_item_group_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),

    unique("process_variant_applicability_item_group_unique").on(
      table.applicabilityId,
      table.itemGroupId,
    ),

    foreignKey({
      columns: [table.organizationId, table.applicabilityId],
      foreignColumns: [processVariantApplicability.organizationId, processVariantApplicability.id],
      name: "process_variant_applicability_item_group_applicability_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.itemGroupId],
      foreignColumns: [itemGroup.organizationId, itemGroup.id],
      name: "process_variant_applicability_item_group_item_group_org_fk",
    }).onDelete("cascade"),

    index("process_variant_applicability_item_group_organization_id_idx").on(table.organizationId),
    index("process_variant_applicability_item_group_applicability_id_idx").on(
      table.applicabilityId,
    ),
  ],
);
