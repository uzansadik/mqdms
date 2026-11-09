import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { member, organization, user } from "./auth";

/**
 * Organizasyon bazlı, üye bazlı yetki kaydı.
 *
 * Roller (`owner`, `admin`, `project-engineer`, ...) kod içinde sabittir ve
 * katalogdaki yetkileri belirler. Bu tablo, organizasyon owner/admin'inin
 * rolün üzerine yazarak belirli bir üyeye belirli bir kaynak yetkisi
 * atamasını sağlar.
 *
 * Değerlendirme sırası: `deny` > `allow` > rol kataloğu.
 */
export const memberPermission = pgTable(
  "member_permission",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),

    resource: text("resource").notNull(),

    action: text("action").notNull(),

    /** `allow` yetki verir, `deny` kaldırır. */
    effect: text("effect").notNull().default("allow"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("member_permission_member_resource_action_uidx").on(
      table.memberId,
      table.resource,
      table.action,
    ),
    index("member_permission_organization_id_idx").on(table.organizationId),
  ],
);
