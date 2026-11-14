import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { organization } from "../initial/auth";
import { processFunctionScope } from "./enums";
import { flowNode } from "./flow-node";
import { processRequirement } from "./process-requirement";
import { processVariantRevision } from "./process-variant-revision";
import { processWorkElement } from "./process-work-element";

/**
 * Process Function.
 *
 * AIAG–VDA fonksiyon analizinin veri temelidir. `PROCESS` kapsamlı fonksiyon
 * prosesin tamamına, `WORK_ELEMENT` kapsamlı fonksiyon tek bir iş unsuruna
 * aittir.
 *
 * Bu fazda tam fonksiyon ağı ve hata analizi geliştirilmez; kayıtlar ileride
 * PFMEA yapısına bağlanabilir olacak şekilde tasarlanır.
 */
export const processFunction = pgTable(
  "process_function",
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

    name: text("name").notNull(),

    description: text("description"),

    functionScope: processFunctionScope("function_scope").notNull().default("PROCESS"),

    /** `WORK_ELEMENT` kapsamlı fonksiyonların bağlandığı iş unsuru. */
    processWorkElementId: uuid("process_work_element_id"),

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
    unique("process_function_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı revision içinde logical id unique'tir.
    unique("process_function_revision_id_logical_id_unique").on(
      table.processVariantRevisionId,
      table.logicalId,
    ),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_function_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_function_derived_from_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.processWorkElementId],
      foreignColumns: [processWorkElement.organizationId, processWorkElement.id],
      name: "process_function_work_element_org_fk",
    }).onDelete("no action"),

    index("process_function_organization_id_idx").on(table.organizationId),
    index("process_function_revision_id_idx").on(table.processVariantRevisionId),
    index("process_function_work_element_id_idx").on(table.processWorkElementId),
  ],
);

/**
 * Process Function ↔ Process Requirement ilişkisi.
 *
 * Bir fonksiyon bir veya daha fazla gereklilikle ilişkilendirilebilir.
 */
export const processFunctionRequirement = pgTable(
  "process_function_requirement",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    processFunctionId: uuid("process_function_id").notNull(),

    processRequirementId: uuid("process_requirement_id").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("process_function_requirement_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),

    unique("process_function_requirement_function_id_requirement_id_unique").on(
      table.processFunctionId,
      table.processRequirementId,
    ),

    foreignKey({
      columns: [table.organizationId, table.processFunctionId],
      foreignColumns: [processFunction.organizationId, processFunction.id],
      name: "process_function_requirement_function_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processRequirementId],
      foreignColumns: [processRequirement.organizationId, processRequirement.id],
      name: "process_function_requirement_requirement_org_fk",
    }).onDelete("cascade"),

    index("process_function_requirement_organization_id_idx").on(table.organizationId),
    index("process_function_requirement_function_id_idx").on(table.processFunctionId),
  ],
);

/**
 * Flow Node ↔ Process Function ilişkisi.
 *
 * Bir fonksiyon birden fazla faaliyet (node) tarafından gerçekleştirilebilir.
 */
export const flowNodeFunction = pgTable(
  "flow_node_function",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    flowNodeId: uuid("flow_node_id").notNull(),

    processFunctionId: uuid("process_function_id").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("flow_node_function_organization_id_id_unique").on(table.organizationId, table.id),

    unique("flow_node_function_node_id_function_id_unique").on(
      table.flowNodeId,
      table.processFunctionId,
    ),

    foreignKey({
      columns: [table.organizationId, table.flowNodeId],
      foreignColumns: [flowNode.organizationId, flowNode.id],
      name: "flow_node_function_node_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.processFunctionId],
      foreignColumns: [processFunction.organizationId, processFunction.id],
      name: "flow_node_function_function_org_fk",
    }).onDelete("cascade"),

    index("flow_node_function_organization_id_idx").on(table.organizationId),
    index("flow_node_function_flow_node_id_idx").on(table.flowNodeId),
    index("flow_node_function_function_id_idx").on(table.processFunctionId),
  ],
);
