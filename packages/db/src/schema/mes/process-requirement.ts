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
import { processRequirementType } from "./enums";
import { processVariantRevision } from "./process-variant-revision";

/**
 * Process Requirement.
 *
 * Prosesin karşılaması gereken gerekliliklerdir: teknik resim toleransı,
 * malzeme sertifikası, geçerli kalibrasyon, raf ömrü vb.
 *
 * Jenerik kütüphanede müşteri veya proje bağlamına ait karakteristik
 * değerler zorunlu tutulmaz; bunlar sonraki fazlarda tanımlanır.
 */
export const processRequirement = pgTable(
  "process_requirement",
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

    requirementType: processRequirementType("requirement_type").notNull().default("PROCESS"),

    /** Gerekliliğin dayandığı kaynak (ör. teknik resim numarası). */
    sourceReference: text("source_reference"),

    /** Zorunlu mu? */
    isMandatory: boolean("is_mandatory").notNull().default(true),

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
    unique("process_requirement_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı revision içinde logical id unique'tir.
    unique("process_requirement_revision_id_logical_id_unique").on(
      table.processVariantRevisionId,
      table.logicalId,
    ),

    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "process_requirement_revision_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.derivedFromId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_requirement_derived_from_org_fk",
    }).onDelete("no action"),

    index("process_requirement_organization_id_idx").on(table.organizationId),
    index("process_requirement_revision_id_idx").on(table.processVariantRevisionId),
    index("process_requirement_requirement_type_idx").on(table.requirementType),
  ],
);
