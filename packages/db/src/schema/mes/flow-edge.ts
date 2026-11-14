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
import { flowEdgeType } from "./enums";
import { flow } from "./flow";
import { flowNode } from "./flow-node";

/**
 * Flow Edge.
 *
 * Diyagramdaki iki node arasındaki bağlantıdır. `condition` alanı **yalnızca
 * dokümantasyon** amaçlıdır; çalıştırılabilir kod kabul etmez ve gerçek
 * üretim kontrolü çalıştırmaz.
 *
 * Kaynak ve hedef node'lar aynı Flow'a ve aynı organizasyona ait olmak
 * zorundadır; bu kural veritabanı constraint'i ile de desteklenir.
 */
export const flowEdge = pgTable(
  "flow_edge",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    flowId: uuid("flow_id").notNull(),

    /** Revision'lar boyunca stabil teknik kimlik. */
    logicalId: text("logical_id").notNull(),

    /** Doğrudan türetildiği kaynak kaydın id'si. */
    derivedFromId: uuid("derived_from_id"),

    sourceNodeId: uuid("source_node_id").notNull(),

    targetNodeId: uuid("target_node_id").notNull(),

    /** Kaynak node'un çıkış tutamacı (karar dalları için). */
    sourceHandle: text("source_handle"),

    /** Hedef node'un giriş tutamacı. */
    targetHandle: text("target_handle"),

    label: text("label"),

    /** Yalnızca dokümantasyon amaçlı koşul metni. */
    condition: text("condition"),

    edgeType: flowEdgeType("edge_type").notNull().default("DEFAULT"),

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
    unique("flow_edge_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı Flow içinde logical id unique'tir.
    unique("flow_edge_flow_id_logical_id_unique").on(table.flowId, table.logicalId),

    foreignKey({
      columns: [table.organizationId, table.flowId],
      foreignColumns: [flow.organizationId, flow.id],
      name: "flow_edge_flow_org_fk",
    }).onDelete("cascade"),

    /*
     * Kaynak ve hedef node'lar aynı organizasyonda olmak zorundadır.
     * Başka organizasyona ait bir node'a bağlanılamaz.
     */
    foreignKey({
      columns: [table.organizationId, table.sourceNodeId],
      foreignColumns: [flowNode.organizationId, flowNode.id],
      name: "flow_edge_source_node_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.targetNodeId],
      foreignColumns: [flowNode.organizationId, flowNode.id],
      name: "flow_edge_target_node_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "flow_edge_derived_from_org_fk",
    }).onDelete("no action"),

    index("flow_edge_organization_id_idx").on(table.organizationId),
    index("flow_edge_flow_id_idx").on(table.flowId),
    index("flow_edge_source_node_id_idx").on(table.sourceNodeId),
    index("flow_edge_target_node_id_idx").on(table.targetNodeId),
  ],
);
