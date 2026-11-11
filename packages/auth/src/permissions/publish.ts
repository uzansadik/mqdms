import { db } from "@mqdms/db";
import { member, memberPermission } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { evaluatePermission, type PermissionGrant } from "./evaluate";
import { resources } from "./resources";
import { parseRoles, type RoleId } from "./roles";

/*
 * Bu modül veritabanına eriştiği için `@mqdms/auth/permissions` barrel'ına
 * **eklenmez**: barrel istemci bileşenlerince de import edildiği için
 * `pg` paketini client bundle'a sürüklerdi. Sunucu tarafı bu modülü doğrudan
 * (`@mqdms/auth/permissions/publish`) import eder.
 */

/**
 * Tüketen uygulamaların token'larında yayınlanan yetki bilgisi.
 *
 * `roles` ve `permissions` organizasyon bağlamına göre hesaplanır; platform
 * rolü (`user` / `superadmin`) ayrı bir claim olarak yayınlanır.
 */
export type PublishedAuthorization = {
  organizationId: string;
  roles: RoleId[];
  permissions: string[];
};

/** Kullanıcının üye olduğu organizasyonlar. */
export type Membership = {
  memberId: string;
  organizationId: string;
  role: string;
};

function toGrant(row: {
  resource: string;
  action: string;
  effect: string;
  memberId?: string;
}): PermissionGrant {
  return {
    resource: row.resource,
    action: row.action,
    effect: row.effect === "deny" ? "deny" : "allow",
    memberId: row.memberId,
  };
}

/** Kullanıcının üyelikleri. */
export async function getMemberships(userId: string): Promise<Membership[]> {
  const rows = await db
    .select({
      memberId: member.id,
      organizationId: member.organizationId,
      role: member.role,
    })
    .from(member)
    .where(eq(member.userId, userId));

  return rows;
}

/** Bir üyeye verilmiş yetki kayıtları (izin override'ları). */
export async function getMemberGrants(memberId: string): Promise<PermissionGrant[]> {
  const rows = await db
    .select({
      resource: memberPermission.resource,
      action: memberPermission.action,
      effect: memberPermission.effect,
      memberId: memberPermission.memberId,
    })
    .from(memberPermission)
    .where(eq(memberPermission.memberId, memberId));

  return rows.map(toGrant);
}

/**
 * Üyeliğin efektif yetkileri.
 *
 * Değerlendirme sırası mevcut RBAC modeliyle aynıdır: açık `deny` grant'i
 * reddeder, açık `allow` grant'i role üstün çıkar, ikisi de yoksa sabit rol
 * kataloğuna düşülür.
 */
export function getEffectivePermissionList({
  role,
  grants,
}: {
  role: string;
  grants: PermissionGrant[];
}): string[] {
  const permissions: string[] = [];

  for (const [resource, definition] of Object.entries(resources)) {
    for (const action of definition.actions) {
      if (evaluatePermission({ role, grants, resource, action })) {
        permissions.push(`${resource}:${action}`);
      }
    }
  }

  return permissions;
}

/**
 * Yetkilendirme için etkin organizasyon.
 *
 * Aktif organizasyon (oturumda yazan) yalnızca kullanıcının **üye olduğu**
 * organizasyonsa kullanılır: üyelik sona ermiş bir organizasyon adı
 * yayınlanmamalıdır. Aktif organizasyon geçersizse ve kullanıcının tek
 * üyeliği varsa o üyelik kullanılır; birden fazla üyelik varsa seçim
 * gerekir (`undefined`).
 */
export function resolveAuthorizationOrganization({
  memberships,
  organizationId,
}: {
  memberships: Membership[];
  organizationId?: string;
}): string | undefined {
  if (memberships.length === 0) {
    return undefined;
  }

  if (
    organizationId &&
    memberships.some((membership) => membership.organizationId === organizationId)
  ) {
    return organizationId;
  }

  return memberships.length === 1 ? memberships[0]?.organizationId : undefined;
}

/**
 * Yayınlanacak yetki bilgisi.
 *
 * Kullanıcının verilen organizasyonda üyeliği yoksa `null` döner; bu durumda
 * organizasyon kapsamlı hiçbir yetki yayınlanmamalıdır.
 */
export async function getPublishedAuthorization({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}): Promise<PublishedAuthorization | null> {
  const rows = await db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);

  const membership = rows[0];

  if (!membership) {
    return null;
  }

  const grants = await getMemberGrants(membership.id);

  return {
    organizationId,
    roles: parseRoles(membership.role),
    permissions: getEffectivePermissionList({ role: membership.role, grants }),
  };
}
