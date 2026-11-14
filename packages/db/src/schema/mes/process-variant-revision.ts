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

import { organization, user } from "../initial/auth";
import { processVariantRevisionStatus } from "./enums";
import { processVariant } from "./process-variant";

/**
 * Process Variant Revision.
 *
 * Varyantın teknik içeriği revision üzerinden yönetilir: Flow, Process Work
 * Element'ler, fonksiyonlar, gereklilikler, girdi/çıktılar ve
 * applicability kayıtları bir revision'a bağlıdır.
 *
 * Yayınlanmış (`RELEASED`) revision teknik içerik olarak **değiştirilemez**;
 * yeni değişiklik yeni bir `DRAFT` revision ile yapılır.
 *
 * `version` kolonu optimistic concurrency içindir: iki kullanıcının
 * değişikliklerinin birbirini sessizce ezmesini engeller.
 */
export const processVariantRevision = pgTable(
  "process_variant_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu Process Variant. */
    processVariantId: uuid("process_variant_id").notNull(),

    /** Revision değeri; aynı varyant içinde unique'tir (ör. `REV.01`). */
    revision: text("revision").notNull(),

    description: text("description"),

    changeReason: text("change_reason"),

    status: processVariantRevisionStatus("status").notNull().default("DRAFT"),

    /**
     * Türetilen kaynak revision.
     *
     * `SPECIALIZED` varyantın hangi jenerik revision'dan kopyalandığını
     * gösterir. Kontrollü güncelleme mekanizması bu alandan yararlanır.
     */
    sourceVariantRevisionId: uuid("source_variant_revision_id"),

    /** Bu revision'ın geçersiz kıldığı önceki revision. */
    supersedesRevisionId: uuid("supersedes_revision_id"),

    /** Optimistic concurrency sürümü; her teknik değişiklikte artar. */
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
    unique("process_variant_revision_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı varyant içinde revision değeri unique'tir.
    unique("process_variant_revision_variant_id_revision_unique").on(
      table.processVariantId,
      table.revision,
    ),

    /*
     * Revision, ait olduğu varyant ile aynı organizasyonda olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.processVariantId],
      foreignColumns: [processVariant.organizationId, processVariant.id],
      name: "process_variant_revision_variant_org_fk",
    }).onDelete("cascade"),

    /*
     * Kaynak revision da aynı organizasyonda olmalıdır: başka organizasyonun
     * revision'ından türetim yapılamaz.
     */
    foreignKey({
      columns: [table.organizationId, table.sourceVariantRevisionId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_variant_revision_source_org_fk",
    }).onDelete("no action"),

    foreignKey({
      columns: [table.organizationId, table.supersedesRevisionId],
      foreignColumns: [table.organizationId, table.id],
      name: "process_variant_revision_supersedes_org_fk",
    }).onDelete("no action"),

    index("process_variant_revision_organization_id_idx").on(table.organizationId),
    index("process_variant_revision_variant_id_idx").on(table.processVariantId),
    index("process_variant_revision_status_idx").on(table.status),
    index("process_variant_revision_source_variant_revision_id_idx").on(
      table.sourceVariantRevisionId,
    ),
  ],
);

/*
 * Ters yönlü ilişkiler (`revision -> flow`, `revision -> work element`, ...)
 * ilgili dosyalarda tanımlıdır; burada yalnızca revision'ın kendi
 * ilişkileri vardır.
 */
