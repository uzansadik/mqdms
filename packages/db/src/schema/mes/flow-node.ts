import {
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization } from "../initial/auth";
import { flowNodeType } from "./enums";
import { flow } from "./flow";

/**
 * Flow Node.
 *
 * Diyagram içerisindeki kutu: bir faaliyet, karar, kontrol veya belge.
 * Flow Node **Process Step değildir** ve Process Work Element'ten bağımsız
 * bir entity'dir.
 *
 * `logicalId` aynı teknik kaydın revision'lar boyunca stabil kimliğidir:
 * bir revision'dan diğerine kopyalandığında değişmez.
 * `derivedFromId` ise kaydın doğrudan türetildiği satırı gösterir.
 */
export const flowNode = pgTable(
  "flow_node",
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

    nodeType: flowNodeType("node_type").notNull().default("ACTIVITY"),

    title: text("title").notNull(),

    description: text("description"),

    /** Canvas konumu; teknik içerik değişikliğinden ayrı değerlendirilir. */
    positionX: numeric("position_x", { precision: 12, scale: 2 }).notNull().default("0"),
    positionY: numeric("position_y", { precision: 12, scale: 2 }).notNull().default("0"),

    width: numeric("width", { precision: 12, scale: 2 }).notNull().default("180"),
    height: numeric("height", { precision: 12, scale: 2 }).notNull().default("72"),

    /** Türe özel, doğrulanmış yapılandırma. */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),

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
    unique("flow_node_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı Flow içinde logical id unique'tir.
    unique("flow_node_flow_id_logical_id_unique").on(table.flowId, table.logicalId),

    foreignKey({
      columns: [table.organizationId, table.flowId],
      foreignColumns: [flow.organizationId, flow.id],
      name: "flow_node_flow_org_fk",
    }).onDelete("cascade"),

    /*
     * Türetilen kaynak node da aynı organizasyonda olmalıdır.
     */
    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "flow_node_derived_from_org_fk",
    }).onDelete("no action"),

    index("flow_node_organization_id_idx").on(table.organizationId),
    index("flow_node_flow_id_idx").on(table.flowId),
    index("flow_node_derived_from_id_idx").on(table.derivedFromId),
  ],
);

/*
 * Edge tablosu `flow-edge.ts` dosyasındadır; döngüsel import oluşturmamak
 * için burada tanımlanmaz.
 */
