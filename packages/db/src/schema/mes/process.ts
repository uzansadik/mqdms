import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { recordStatus } from "../inventory/enums";
import { processCategory } from "./enums";

/**
 * Master Process.
 *
 * Organizasyonun ortak proses tanımıdır; **bir projeye ait olmaz** ve
 * üzerinde operasyon numarası (OP10, OP20) tutulmaz. Operasyon numarası
 * gelecekte Project Process Step üzerinde tanımlanacaktır.
 *
 * Kullanılan proses kayıtları fiziksel olarak silinmez; arşivlenir.
 */
export const process = pgTable(
  "process",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Kısa tanımlayıcı (ör. `GKK`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    category: processCategory("category").notNull().default("OTHER"),

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
    unique("process_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı proses kodu iki kez kullanılamaz.
    uniqueIndex("process_organization_id_code_lower_uidx").on(
      table.organizationId,
      sql`lower(${table.code})`,
    ),

    index("process_organization_id_idx").on(table.organizationId),
    index("process_category_idx").on(table.category),
    index("process_archived_at_idx").on(table.archivedAt),
  ],
);

/*
 * Ters yönlü ilişkiler (`process -> process_variant`) bilinçli olarak burada
 * tanımlanmaz: iki dosya arasında döngüsel import oluşturur. Bu yön
 * `process-variant.ts` dosyasındadır.
 */
