import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { recordStatus } from "../inventory/enums";
import { processVariantType } from "./enums";
import { process } from "./process";

/**
 * Process Variant.
 *
 * Master Process'in belirli bir uygulamasıdır. `GENERIC` varyant jenerik
 * uygulamadır; `SPECIALIZED` varyant bir jenerik varyantın belirli bir
 * revision'ından türetilir ya da bağımsız oluşturulur.
 *
 * Varyant kendi revision geçmişine sahiptir: teknik içerik yalnızca
 * revision üzerinden yönetilir.
 */
export const processVariant = pgTable(
  "process_variant",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Ait olduğu Master Process. */
    processId: uuid("process_id").notNull(),

    /** Kısa tanımlayıcı (ör. `GKK-METAL`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    variantType: processVariantType("variant_type").notNull().default("GENERIC"),

    status: recordStatus("status").notNull().default("ACTIVE"),

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

    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    // Composite foreign key hedefi.
    unique("process_variant_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı varyant kodu iki kez kullanılamaz.
    uniqueIndex("process_variant_organization_id_code_lower_uidx").on(
      table.organizationId,
      sql`lower(${table.code})`,
    ),

    /*
     * Varyant, ait olduğu Master Process ile **aynı organizasyonda** olmak
     * zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.processId],
      foreignColumns: [process.organizationId, process.id],
      name: "process_variant_process_org_fk",
    }).onDelete("cascade"),

    index("process_variant_organization_id_idx").on(table.organizationId),
    index("process_variant_process_id_idx").on(table.processId),
    index("process_variant_archived_at_idx").on(table.archivedAt),
  ],
);

/*
 * `process_variant_revision` tablosu bu dosyada tanımlanmaz: iki dosya
 * arasında döngüsel import oluşturur. Bu yön `process-variant-revision.ts`
 * dosyasındadır.
 */
