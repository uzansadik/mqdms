import { sql } from "drizzle-orm";
import {
  date,
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
import { processVariantRevision } from "../mes/process-variant-revision";
import { fmeaDocumentStatus, fmeaEvaluationMethod, fmeaType } from "./enums";

/**
 * FMEA Belgesi.
 *
 * AIAG & VDA'nın yedi adımının çıktısını taşıyan ana kayıttır: bir
 * Process Variant Revision'ın içine yerleşir ve o revision'ın teknik
 * içeriğiyle aynı yaşam döngüsünü paylaşır.
 *
 * `PFMEA` / `DFMEA` / `SFMEA` tipleri aynı şemayı kullanır; yalnızca
 * *yapı analizi kaynağı* tipe göre değişir (bkz. `fmea_structure_element`).
 */
export const fmeaDocument = pgTable(
  "fmea_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Belgenin ait olduğu Process Variant Revision. */
    processVariantRevisionId: uuid("process_variant_revision_id").notNull(),

    /** Kısa tanımlayıcı (ör. `PFMEA-GKK-METAL`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    fmeaType: fmeaType("fmea_type").notNull().default("PFMEA"),

    status: fmeaDocumentStatus("status").notNull().default("DRAFT"),

    /** Kullanılan değerlendirme yöntemi. */
    evaluationMethod: fmeaEvaluationMethod("evaluation_method").notNull().default("BOTH"),

    /** Analiz kapsamı (AIAG–VDA adım 1). */
    scopeDescription: text("scope_description"),

    /** Analizden sorumlu kişi veya ekip. */
    responsibility: text("responsibility"),

    /** Hedef termin. */
    targetDate: date("target_date"),

    /**
     * Optimistic concurrency sürümü.
     *
     * Her içerik kaydında artar; eski bir ekrandan gelen mutation reddedilir.
     */
    version: integer("version").notNull().default(1),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedById: text("submitted_by_id").references(() => user.id, { onDelete: "set null" }),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedById: text("approved_by_id").references(() => user.id, { onDelete: "set null" }),

    releasedAt: timestamp("released_at", { withTimezone: true }),
    releasedById: text("released_by_id").references(() => user.id, { onDelete: "set null" }),

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
    unique("fmea_document_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı belge kodu iki kez kullanılamaz.
    uniqueIndex("fmea_document_organization_id_code_lower_uidx").on(
      table.organizationId,
      sql`lower(${table.code})`,
    ),

    /*
     * Aynı revision içinde her FMEA tipinden tek belge bulunur.
     */
    unique("fmea_document_revision_id_fmea_type_unique").on(
      table.processVariantRevisionId,
      table.fmeaType,
    ),

    /*
     * Belge, ait olduğu revision ile **aynı organizasyonda** olmak
     * zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.processVariantRevisionId],
      foreignColumns: [processVariantRevision.organizationId, processVariantRevision.id],
      name: "fmea_document_revision_org_fk",
    }).onDelete("cascade"),

    index("fmea_document_organization_id_idx").on(table.organizationId),
    index("fmea_document_revision_id_idx").on(table.processVariantRevisionId),
    index("fmea_document_fmea_type_idx").on(table.fmeaType),
    index("fmea_document_status_idx").on(table.status),
  ],
);
