import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { flowType } from "./enums";
import { processVariantRevision } from "./process-variant-revision";

/**
 * Flow.
 *
 * Faaliyet ve karar diyagramının ortak altyapısıdır. Aynı Flow Editor
 * ileride Master Process Variant Flow, Project Process Step Flow ve Main
 * Process Flow alanlarında da kullanılacaktır.
 *
 * Flow'un sahibi **açık foreign key** ile yönetilir: polymorphic
 * `ownerType`/`ownerId` yapısı kullanılmaz.
 */
export const flow = pgTable(
  "flow",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    description: text("description"),

    flowType: flowType("flow_type").notNull().default("PROCESS_VARIANT"),

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
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("flow_organization_id_id_unique").on(table.organizationId, table.id),

    index("flow_organization_id_idx").on(table.organizationId),
    index("flow_flow_type_idx").on(table.flowType),
  ],
);

/**
 * Process Variant Revision → Flow sahipliği.
 *
 * Bir revision'ın en fazla bir primary Flow'u olabilir; bu yüzden
 * `process_variant_revision_id` üzerinde unique constraint vardır.
 */
export const processVariantRevisionFlow = pgTable(
  "process_variant_revision_flow",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    processVariantRevisionId: uuid("process_variant_revision_id").notNull(),

    flowId: uuid("flow_id").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("process_variant_revision_flow_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),

    // Bir revision'ın tek primary Flow'u olabilir.
    unique("process_variant_revision_flow_revision_id_unique").on(table.processVariantRevisionId),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_variant_revision_flow_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.flowId],
      foreignColumns: [flow.organizationId, flow.id],
      name: "process_variant_revision_flow_flow_org_fk",
    }).onDelete("cascade"),

    index("process_variant_revision_flow_organization_id_idx").on(table.organizationId),
    index("process_variant_revision_flow_flow_id_idx").on(table.flowId),
  ],
);

/*
 * Node ve Edge tabloları `flow-node.ts` ve `flow-edge.ts` dosyalarındadır;
 * döngüsel import oluşturmamak için burada tanımlanmaz.
 */
