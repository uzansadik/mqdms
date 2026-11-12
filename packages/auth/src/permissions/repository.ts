import "server-only";

import { db } from "@mqdms/db";
import {
  invitationRole,
  member,
  memberPermission,
  memberRole,
  organizationRole,
  organizationRolePermission,
  user,
} from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import type { PermissionEffect, PermissionGrant, RoleGrant } from "./evaluate";

/**
 * Veritabanı erişimi gerektiren izin sorguları.
 *
 * Bu modül sunucu tarafıdır (`server-only`); tarayıcıya sürüklenmemelidir.
 * Tüm sorgular `organizationId` ile kısıtlanır: bir organizasyonun üyesi
 * başka bir organizasyonun üye, rol veya grant kayıtlarını göremez.
 */

/** Organizasyondaki roller ve izinleri. */
export type OrganizationRoleRecord = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: RoleGrant[];
};

/** Bir rolün izin satırları. */
export async function getRolePermissions(
  organizationId: string,
  roleIds: readonly string[],
): Promise<RoleGrant[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      resource: organizationRolePermission.resource,
      action: organizationRolePermission.action,
    })
    .from(organizationRolePermission)
    .where(
      and(
        eq(organizationRolePermission.organizationId, organizationId),
        inArray(organizationRolePermission.roleId, [...roleIds]),
      ),
    );

  return rows.map((row) => ({ resource: row.resource, action: row.action }));
}

/** Organizasyondaki tüm roller. */
export async function listOrganizationRoles(
  organizationId: string,
): Promise<OrganizationRoleRecord[]> {
  const rows = await db
    .select({
      id: organizationRole.id,
      organizationId: organizationRole.organizationId,
      slug: organizationRole.slug,
      name: organizationRole.name,
      description: organizationRole.description,
    })
    .from(organizationRole)
    .where(eq(organizationRole.organizationId, organizationId))
    .orderBy(organizationRole.name);

  if (rows.length === 0) {
    return [];
  }

  const permissionRows = await db
    .select({
      roleId: organizationRolePermission.roleId,
      resource: organizationRolePermission.resource,
      action: organizationRolePermission.action,
    })
    .from(organizationRolePermission)
    .where(eq(organizationRolePermission.organizationId, organizationId));

  const permissionsByRole = new Map<string, RoleGrant[]>();

  for (const permission of permissionRows) {
    const existing = permissionsByRole.get(permission.roleId);

    if (existing) {
      existing.push({ resource: permission.resource, action: permission.action });

      continue;
    }

    permissionsByRole.set(permission.roleId, [
      { resource: permission.resource, action: permission.action },
    ]);
  }

  return rows.map((row) => ({
    ...row,
    permissions: permissionsByRole.get(row.id) ?? [],
  }));
}

/** Tek bir rolün kaydı ve izinleri. */
export async function getOrganizationRole(
  organizationId: string,
  roleId: string,
): Promise<OrganizationRoleRecord | null> {
  const rows = await db
    .select({
      id: organizationRole.id,
      organizationId: organizationRole.organizationId,
      slug: organizationRole.slug,
      name: organizationRole.name,
      description: organizationRole.description,
    })
    .from(organizationRole)
    .where(
      and(eq(organizationRole.organizationId, organizationId), eq(organizationRole.id, roleId)),
    )
    .limit(1);

  const role = rows[0];

  if (!role) {
    return null;
  }

  const permissions = await getRolePermissions(organizationId, [role.id]);

  return { ...role, permissions };
}

/** Üyeye atanmış fonksiyonel rollerin id'leri. */
export async function getMemberRoleIds(
  organizationId: string,
  memberId: string,
): Promise<string[]> {
  const rows = await db
    .select({ roleId: memberRole.roleId })
    .from(memberRole)
    .where(and(eq(memberRole.organizationId, organizationId), eq(memberRole.memberId, memberId)));

  return rows.map((row) => row.roleId);
}

/** Üyeye atanmış rollerin birleşik izinleri. */
export async function getMemberRoleGrants(
  organizationId: string,
  memberId: string,
): Promise<RoleGrant[]> {
  const roleIds = await getMemberRoleIds(organizationId, memberId);

  return getRolePermissions(organizationId, roleIds);
}

/** Bir üyeye verilmiş yetki kayıtları (izin override'ları). */
export async function getMemberGrants(
  organizationId: string,
  memberId: string,
): Promise<PermissionGrant[]> {
  const rows = await db
    .select({
      resource: memberPermission.resource,
      action: memberPermission.action,
      effect: memberPermission.effect,
      memberId: memberPermission.memberId,
    })
    .from(memberPermission)
    .where(
      and(
        eq(memberPermission.organizationId, organizationId),
        eq(memberPermission.memberId, memberId),
      ),
    );

  return rows.map((row) => ({
    resource: row.resource,
    action: row.action,
    effect: toEffect(row.effect),
    memberId: row.memberId,
  }));
}

/** Organizasyondaki tüm yetki kayıtları. */
export async function getOrganizationGrants(organizationId: string): Promise<PermissionGrant[]> {
  const rows = await db
    .select({
      resource: memberPermission.resource,
      action: memberPermission.action,
      effect: memberPermission.effect,
      memberId: memberPermission.memberId,
    })
    .from(memberPermission)
    .where(eq(memberPermission.organizationId, organizationId));

  return rows.map((row) => ({
    resource: row.resource,
    action: row.action,
    effect: toEffect(row.effect),
    memberId: row.memberId,
  }));
}

/**
 * Etiketi izin etkisine çevirir.
 *
 * Veritabanındaki check constraint `allow`/`deny` dışındaki değerleri
 * engeller; yine de geçersiz bir değer **fail closed** olarak `deny`
 * sayılır.
 */
export function toEffect(value: string): PermissionEffect {
  return value === "allow" ? "allow" : "deny";
}

/** Organizasyondaki üye kayıtları (kullanıcı bilgileriyle birlikte). */
export async function listOrganizationMembers(organizationId: string) {
  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(member.createdAt);

  return rows;
}

/** Organizasyondaki tüm üye → rol atamaları. */
export async function getOrganizationMemberRoleMap(
  organizationId: string,
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ memberId: memberRole.memberId, roleId: memberRole.roleId })
    .from(memberRole)
    .where(eq(memberRole.organizationId, organizationId));

  const map = new Map<string, string[]>();

  for (const row of rows) {
    const existing = map.get(row.memberId);

    if (existing) {
      existing.push(row.roleId);

      continue;
    }

    map.set(row.memberId, [row.roleId]);
  }

  return map;
}

/** Davete atanmış fonksiyonel rollerin id'leri. */
export async function getInvitationRoleIds(
  organizationId: string,
  invitationId: string,
): Promise<string[]> {
  const rows = await db
    .select({ roleId: invitationRole.roleId })
    .from(invitationRole)
    .where(
      and(
        eq(invitationRole.organizationId, organizationId),
        eq(invitationRole.invitationId, invitationId),
      ),
    );

  return rows.map((row) => row.roleId);
}
