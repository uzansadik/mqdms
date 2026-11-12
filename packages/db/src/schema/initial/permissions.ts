import { relations } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { invitation, member, organization, user } from "./auth";

/**
 * Organizasyona özel fonksiyonel rol.
 *
 * better-auth `member.role` alanı yalnızca `owner` ve `member` yönetim
 * rollerini taşır. İş modüllerinin yetkileri (Fabrika Müdürü, Proje Mühendisi,
 * ...) bu tabloda tutulur: her organizasyon kendi rol kayıtlarına sahiptir,
 * roller arasında global paylaşım yoktur.
 *
 * Rol kayıtları bootstrap sırasında seed katalogundan üretilir; owner
 * tarafından düzenlenebilir.
 */
export const organizationRole = pgTable(
  "organization_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Kısa, değişmez tanımlayıcı (ör. `plant-manager`). */
    slug: text("slug").notNull(),

    name: text("name").notNull(),

    description: text("description"),

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
    uniqueIndex("organization_role_organization_id_slug_uidx").on(table.organizationId, table.slug),

    /*
     * Composite unique: alt tabloların (organization_id, role_id) yabancı
     * anahtarını destekler. Bu sayede bir rolün satırı hangi organizasyona
     * aitse, alt tablolar da aynı organizasyona ait olmak zorundadır.
     */
    uniqueIndex("organization_role_organization_id_id_uidx").on(table.organizationId, table.id),

    index("organization_role_organization_id_idx").on(table.organizationId),
  ],
);

/**
 * Rolün sahip olduğu kaynak izinleri (allow-only).
 *
 * Bir rol hiçbir zaman `deny` taşımaz; reddetme yetkisi yalnızca üye bazlı
 * grant'ta bulunur.
 */
export const organizationRolePermission = pgTable(
  "organization_role_permission",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
      .notNull()
      .references(() => organizationRole.id, { onDelete: "cascade" }),

    resource: text("resource").notNull(),

    action: text("action").notNull(),
  },
  (table) => [
    uniqueIndex("organization_role_permission_role_id_resource_action_uidx").on(
      table.roleId,
      table.resource,
      table.action,
    ),

    /*
     * Rol ve organizasyon eşleşmesi: `organization_id` her zaman
     * `organization_role.organization_id` ile aynı olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [organizationRole.organizationId, organizationRole.id],
      name: "organization_role_permission_role_org_fk",
    }).onDelete("cascade"),

    index("organization_role_permission_organization_id_idx").on(table.organizationId),
  ],
);

/**
 * Üyeye atanmış fonksiyonel rol.
 *
 * Bir üye birden fazla role sahip olabilir. Rollerin birleşimi üyenin rol
 * izinlerini oluşturur.
 */
export const memberRole = pgTable(
  "member_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
      .notNull()
      .references(() => organizationRole.id, { onDelete: "cascade" }),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("member_role_member_id_role_id_uidx").on(table.memberId, table.roleId),

    /*
     * Üye ve rol aynı organizasyona ait olmak zorundadır; aksi halde başka bir
     * organizasyonun rolü atanmış sayılır.
     */
    foreignKey({
      columns: [table.organizationId, table.memberId],
      foreignColumns: [member.organizationId, member.id],
      name: "member_role_member_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [organizationRole.organizationId, organizationRole.id],
      name: "member_role_role_org_fk",
    }).onDelete("cascade"),

    index("member_role_organization_id_idx").on(table.organizationId),
    index("member_role_member_id_idx").on(table.memberId),
  ],
);

/**
 * Organizasyon bazlı, üye bazlı yetki kaydı.
 *
 * Roller (`plant-manager`, `project-engineer`, ...) organizasyona özel
 * kayıtlardır ve `organization_role_permission` üzerinden izin taşır. Bu
 * tablo, owner'ın rolün üzerine yazarak belirli bir üyeye belirli bir kaynak
 * yetkisi atamasını (veya kaldırmasını) sağlar.
 *
 * Değerlendirme sırası: `deny` > `allow` > rol izinleri.
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

    /*
     * Etiket yalnızca `allow` veya `deny` olabilir. Geçersiz bir değer
     * yazılırsa değerlendirme fail closed uygulanır.
     */
    check("member_permission_effect_check", sql`${table.effect} in ('allow', 'deny')`),

    /*
     * Üye ve organizasyon eşleşmesi: grant'ın ait olduğu üye, grant'ın
     * organizasyonuna ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.memberId],
      foreignColumns: [member.organizationId, member.id],
      name: "member_permission_member_org_fk",
    }).onDelete("cascade"),

    index("member_permission_organization_id_idx").on(table.organizationId),
  ],
);

/**
 * Davete atanmış fonksiyonel roller.
 *
 * Davet kabul edildiğinde bu roller üyeye atanır. Rol id'leri sunucu
 * tarafında saklanır; istemci rol seçemez.
 */
export const invitationRole = pgTable(
  "invitation_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    invitationId: text("invitation_id")
      .notNull()
      .references(() => invitation.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
      .notNull()
      .references(() => organizationRole.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("invitation_role_invitation_id_role_id_uidx").on(table.invitationId, table.roleId),

    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [organizationRole.organizationId, organizationRole.id],
      name: "invitation_role_role_org_fk",
    }).onDelete("cascade"),

    index("invitation_role_organization_id_idx").on(table.organizationId),
  ],
);

export const organizationRoleRelations = relations(organizationRole, ({ many }) => ({
  permissions: many(organizationRolePermission),
  memberRoles: many(memberRole),
}));

export const organizationRolePermissionRelations = relations(
  organizationRolePermission,
  ({ one }) => ({
    role: one(organizationRole, {
      fields: [organizationRolePermission.roleId],
      references: [organizationRole.id],
    }),
  }),
);

export const memberRoleRelations = relations(memberRole, ({ one }) => ({
  member: one(member, {
    fields: [memberRole.memberId],
    references: [member.id],
  }),
  role: one(organizationRole, {
    fields: [memberRole.roleId],
    references: [organizationRole.id],
  }),
}));

export const memberPermissionRelations = relations(memberPermission, ({ one }) => ({
  member: one(member, {
    fields: [memberPermission.memberId],
    references: [member.id],
  }),
}));

export const invitationRoleRelations = relations(invitationRole, ({ one }) => ({
  invitation: one(invitation, {
    fields: [invitationRole.invitationId],
    references: [invitation.id],
  }),
  role: one(organizationRole, {
    fields: [invitationRole.roleId],
    references: [organizationRole.id],
  }),
}));
