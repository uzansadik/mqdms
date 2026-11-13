import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { importStatus, importType } from "./enums";

/**
 * Import işi.
 *
 * Bir import **önizleme ve onay olmadan mevcut veriyi değiştirmez**. Dosya
 * yüklenir, kolonlar eşleştirilir, satırlar doğrulanır, kullanıcı çakışmaları
 * çözer ve onaydan sonra veriler kontrollü transaction içinde yazılır.
 *
 * Aynı dosya tekrar import edildiğinde `fileHash` sayesinde gereksiz
 * duplicate kayıt veya yeni BOM revision oluşmaz: import mevcut kayıtları
 * günceller.
 */
export const importJob = pgTable(
  "import_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    importType: importType("import_type").notNull(),

    /** Verinin kaynaklandığı sistem (ör. `DINAMO`). */
    sourceSystem: text("source_system"),

    fileName: text("file_name").notNull(),

    /** Dosyanın içeriğinden hesaplanan hash; aynı dosyanın tekrarını tanır. */
    fileHash: text("file_hash").notNull(),

    /** Yüklenen dosyanın depolama nesne anahtarı. */
    fileKey: text("file_key"),

    status: importStatus("status").notNull().default("PENDING"),

    /** Dosya kolonlarının mQDMS alanlarına eşleştirmesi. */
    columnMapping: jsonb("column_mapping")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),

    totalRows: integer("total_rows").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),

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

    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("import_job_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Aynı dosyanın tekrarı aranır: dosya hash'i ve import türü üzerinden
     * mevcut iş bulunur.
     */
    index("import_job_file_hash_idx").on(table.organizationId, table.importType, table.fileHash),
    index("import_job_organization_id_idx").on(table.organizationId),
    index("import_job_status_idx").on(table.status),
  ],
);

/**
 * Import işindeki satır hataları.
 *
 * Import sırasında binlerce satır için kontrolsüz audit kaydı üretilmez:
 * import job seviyesinde özet yazılır, hatalar burada saklanır.
 */
export const importJobError = pgTable(
  "import_job_error",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),

    /** Dosyadaki satır numarası (1 tabanlı). */
    rowNumber: integer("row_number"),

    /** Hatanın oluştuğu kolon. */
    column: text("column"),

    /** Makine tarafından okunabilir hata kodu. */
    code: text("code").notNull(),

    message: text("message").notNull(),

    /** Hatanın ayrıntıları (satır verisi, beklenen değer). */
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("import_job_error_import_job_id_idx").on(table.importJobId),
  ],
);

export const importJobRelations = relations(importJob, ({ many }) => ({
  errors: many(importJobError),
}));

export const importJobErrorRelations = relations(importJobError, ({ one }) => ({
  job: one(importJob, {
    fields: [importJobError.importJobId],
    references: [importJob.id],
  }),
}));
