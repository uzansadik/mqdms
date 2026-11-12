import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

/**
 * İlk kurulumun durumu.
 *
 * Tek satırlık (singleton) bir kayıttır: `id` sabit bir değerdir ve
 * bootstrap yalnızca bir kez çalışabilir. Durum, yarım kalan bir kurulumun
 * kurtarılmasını ve ikinci bir denemenin reddedilmesini sağlar.
 */
export const bootstrapState = pgTable("bootstrap_state", {
  /** Sabit değer: `"bootstrap"`. */
  id: text("id").primaryKey(),

  /**
   * `pending` — kurulum başladı, tamamlanmadı.
   * `completed` — kurulum tamamlandı.
   */
  status: text("status").notNull(),

  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),

  ownerUserId: text("owner_user_id").references(() => user.id, {
    onDelete: "set null",
  }),

  /** Seed edilen rol kataloğunun sürümü. */
  seedVersion: text("seed_version"),

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
});
