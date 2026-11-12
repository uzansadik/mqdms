import "server-only";

import { writeAuditLog } from "@mqdms/audit";
import { db } from "@mqdms/db";
import {
  member,
  memberPermission,
  memberRole,
  organization,
  organizationRole,
  organizationRolePermission,
} from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { auth } from "../server";

import {
  evaluatePermission,
  getEffectivePermissionList,
  getEffectivePermissions,
  type PermissionEffect,
  type PermissionEvaluationInput,
  type PermissionGrant,
  type RoleGrant,
} from "./evaluate";
import {
  getInvitationRoleIds,
  getMemberGrants,
  getMemberRoleGrants,
  getMemberRoleIds,
  getOrganizationRole,
  listOrganizationRoles,
  type OrganizationRoleRecord,
} from "./repository";
import { isResourceActionKey } from "./resources";
import { isOwnerRole } from "./roles";

/**
 * Yetkilendirme bağlamı.
 *
 * Bağlam **her zaman sunucuda** üretilir; istemciden gelen bir bağlama
 * güvenilmez. Mutation'lar aktör kimliğini, organizasyon üyeliğini, owner
 * durumunu ve hedef üye/rol kapsamını bu bağlamdan doğrular.
 */
export type AuthContext = {
  userId: string;

  user: {
    id: string;
    name: string;
    email: string;
  };

  sessionId: string;

  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };

  organizationId: string;

  /** Oturumdaki kullanıcının bu organizasyondaki üye kaydı. */
  member: {
    id: string;
    role: string;
  };

  /** Üye `owner` mi? Owner'ın yönetim yetkileri değiştirilemez. */
  isOwner: boolean;
};

/** Yetkilendirme hatası. */
export class PermissionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "ORGANIZATION_REQUIRED"
      | "NOT_FOUND"
      | "INVALID_INPUT",
  ) {
    super(message);
    this.name = "PermissionError";
  }
}

type MembershipRow = {
  memberId: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLogo: string | null;
};

/**
 * Kullanıcının üyelikleri ve organizasyon bilgileri.
 *
 * Aktif organizasyon oturumda yazılı olsa bile üyelik doğrulanır: üyelik
 * sona ermiş bir organizasyon kullanılamaz.
 */
async function getMemberships(userId: string): Promise<MembershipRow[]> {
  const rows = await db
    .select({
      memberId: member.id,
      role: member.role,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationLogo: organization.logo,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));

  return rows;
}

/**
 * Oturumdan yetkilendirme bağlamı üretir.
 *
 * `organizationId` verilirse o organizasyon kullanılır (üyelik doğrulanır).
 * Verilmezse oturumdaki aktif organizasyon kullanılır; o da geçersizse ve
 * kullanıcının tek üyeliği varsa o üyelik seçilir. Birden fazla üyelik varsa
 * bağlam üretilmez: organizasyon seçimi gerekir.
 */
export async function getAuthContext(
  requestHeaders: Headers,
  organizationId?: string,
): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return null;
  }

  const memberships = await getMemberships(session.user.id);

  if (memberships.length === 0) {
    return null;
  }

  const requested = organizationId ?? session.session.activeOrganizationId ?? undefined;

  const membership = requested
    ? memberships.find((row) => row.organizationId === requested)
    : memberships.length === 1
      ? memberships[0]
      : undefined;

  if (!membership) {
    return null;
  }

  return {
    userId: session.user.id,

    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },

    sessionId: session.session.id,

    organization: {
      id: membership.organizationId,
      name: membership.organizationName,
      slug: membership.organizationSlug,
      logo: membership.organizationLogo,
    },

    organizationId: membership.organizationId,

    member: {
      id: membership.memberId,
      role: membership.role,
    },

    isOwner: isOwnerRole(membership.role),
  };
}

/**
 * Yetkilendirme bağlamını zorunlu kılar.
 *
 * Oturum yoksa `UNAUTHENTICATED`, organizasyon erişimi yoksa
 * `ORGANIZATION_REQUIRED` hatası atar.
 */
export async function requireAuthContext(
  requestHeaders: Headers,
  organizationId?: string,
): Promise<AuthContext> {
  const context = await getAuthContext(requestHeaders, organizationId);

  if (!context) {
    throw new PermissionError("Authentication is required.", "UNAUTHENTICATED");
  }

  return context;
}

/** Bir üyenin değerlendirme girdisini oluşturur. */
export async function buildEvaluationInput(
  organizationId: string,
  memberId: string,
  isOwner: boolean,
): Promise<PermissionEvaluationInput> {
  const [grants, roleGrants] = await Promise.all([
    getMemberGrants(organizationId, memberId),
    getMemberRoleGrants(organizationId, memberId),
  ]);

  return { isOwner, grants, roleGrants };
}

/** Aktif üyenin belirli bir kaynak/aksiyon yetkisi var mı? */
export async function hasPermission(
  context: AuthContext,
  resource: string,
  action: string,
): Promise<boolean> {
  const input = await buildEvaluationInput(
    context.organizationId,
    context.member.id,
    context.isOwner,
  );

  return evaluatePermission(input, resource, action);
}

/** Yönetim yetkisi gerektiren işlemler için owner kontrolü. */
export function requireOwner(context: AuthContext): AuthContext {
  if (!context.isOwner) {
    throw new PermissionError("Only the organization owner can perform this action.", "FORBIDDEN");
  }

  return context;
}

/* -------------------------------------------------------------------------
 * Rol yönetimi
 * ---------------------------------------------------------------------- */

const permissionSchema = z.object({
  resource: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

const createRoleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case."),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(permissionSchema).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  permissions: z.array(permissionSchema).optional(),
});

export type CreateRoleInput = z.input<typeof createRoleSchema>;
export type UpdateRoleInput = z.input<typeof updateRoleSchema>;

/** Bir izin çifti katalogda var mı? */
function assertKnownPermissions(permissions: readonly { resource: string; action: string }[]) {
  for (const permission of permissions) {
    if (!isResourceActionKey(`${permission.resource}:${permission.action}`)) {
      throw new PermissionError(
        `Unknown resource or action: ${permission.resource}:${permission.action}`,
        "INVALID_INPUT",
      );
    }
  }
}

/** Organizasyondaki roller. */
export async function listRoles(context: AuthContext): Promise<OrganizationRoleRecord[]> {
  return listOrganizationRoles(context.organizationId);
}

/** Yeni rol oluşturur. */
export async function createRole(context: AuthContext, input: unknown): Promise<string> {
  requireOwner(context);

  const parsed = createRoleSchema.safeParse(input);

  if (!parsed.success) {
    throw new PermissionError("Invalid role data.", "INVALID_INPUT");
  }

  assertKnownPermissions(parsed.data.permissions);

  const created = await db
    .insert(organizationRole)
    .values({
      organizationId: context.organizationId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdById: context.userId,
    })
    .onConflictDoNothing()
    .returning({ id: organizationRole.id });

  const roleId = created[0]?.id;

  if (!roleId) {
    throw new PermissionError("A role with this slug already exists.", "INVALID_INPUT");
  }

  await replaceRolePermissions(context, roleId, parsed.data.permissions);

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "role.created",
    target: { type: "role", id: roleId },
    metadata: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      permissions: parsed.data.permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      ),
    },
  });

  return roleId;
}

/** Rolün adını, açıklamasını ve izinlerini günceller. */
export async function updateRole(
  context: AuthContext,
  roleId: string,
  input: unknown,
): Promise<void> {
  requireOwner(context);

  const parsed = updateRoleSchema.safeParse(input);

  if (!parsed.success) {
    throw new PermissionError("Invalid role data.", "INVALID_INPUT");
  }

  const role = await getOrganizationRole(context.organizationId, roleId);

  if (!role) {
    throw new PermissionError("Role not found in this organization.", "NOT_FOUND");
  }

  if (parsed.data.permissions) {
    assertKnownPermissions(parsed.data.permissions);
  }

  await db.transaction(async (tx) => {
    if (parsed.data.name !== undefined || parsed.data.description !== undefined) {
      await tx
        .update(organizationRole)
        .set({
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organizationRole.organizationId, context.organizationId),
            eq(organizationRole.id, roleId),
          ),
        );
    }

    if (parsed.data.permissions) {
      await tx
        .delete(organizationRolePermission)
        .where(
          and(
            eq(organizationRolePermission.organizationId, context.organizationId),
            eq(organizationRolePermission.roleId, roleId),
          ),
        );

      if (parsed.data.permissions.length > 0) {
        await tx.insert(organizationRolePermission).values(
          parsed.data.permissions.map((permission) => ({
            organizationId: context.organizationId,
            roleId,
            resource: permission.resource,
            action: permission.action,
          })),
        );
      }
    }
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "role.updated",
    target: { type: "role", id: roleId },
    metadata: {
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: parsed.data.permissions?.map(
        (permission) => `${permission.resource}:${permission.action}`,
      ),
    },
  });
}

/** Rol silinmeden önce etkilenecek üyelerin listesi. */
export async function getRoleAssignmentPreview(
  context: AuthContext,
  roleId: string,
): Promise<{ memberId: string; userId: string }[]> {
  requireOwner(context);

  const rows = await db
    .select({ memberId: memberRole.memberId, userId: member.userId })
    .from(memberRole)
    .innerJoin(member, eq(memberRole.memberId, member.id))
    .where(
      and(eq(memberRole.organizationId, context.organizationId), eq(memberRole.roleId, roleId)),
    );

  return rows;
}

/**
 * Rolü siler.
 *
 * Role bağlı atamalar da silinir; işlem transaction içinde yapılır ve audit
 * kaydı yazılır.
 */
export async function deleteRole(context: AuthContext, roleId: string): Promise<void> {
  requireOwner(context);

  const role = await getOrganizationRole(context.organizationId, roleId);

  if (!role) {
    throw new PermissionError("Role not found in this organization.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(memberRole)
      .where(
        and(eq(memberRole.organizationId, context.organizationId), eq(memberRole.roleId, roleId)),
      );

    await tx
      .delete(organizationRolePermission)
      .where(
        and(
          eq(organizationRolePermission.organizationId, context.organizationId),
          eq(organizationRolePermission.roleId, roleId),
        ),
      );

    await tx
      .delete(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, context.organizationId),
          eq(organizationRole.id, roleId),
        ),
      );
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "role.deleted",
    target: { type: "role", id: roleId },
    metadata: { slug: role.slug, name: role.name },
  });
}

/* -------------------------------------------------------------------------
 * Üye rolleri ve izinleri
 * ---------------------------------------------------------------------- */

/** Üyenin rollerini değiştirir. */
export async function assignMemberRoles(
  context: AuthContext,
  memberId: string,
  roleIds: readonly string[],
): Promise<void> {
  requireOwner(context);

  const target = await getMemberInOrganization(context.organizationId, memberId);

  if (!target) {
    throw new PermissionError("Member not found in this organization.", "NOT_FOUND");
  }

  if (isOwnerRole(target.role)) {
    throw new PermissionError("The owner's roles cannot be changed.", "FORBIDDEN");
  }

  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length > 0) {
    const roles = await db
      .select({ id: organizationRole.id })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, context.organizationId),
          inArray(organizationRole.id, uniqueRoleIds),
        ),
      );

    if (roles.length !== uniqueRoleIds.length) {
      throw new PermissionError(
        "One or more roles do not belong to this organization.",
        "INVALID_INPUT",
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(memberRole)
      .where(
        and(
          eq(memberRole.organizationId, context.organizationId),
          eq(memberRole.memberId, memberId),
        ),
      );

    if (uniqueRoleIds.length > 0) {
      await tx.insert(memberRole).values(
        uniqueRoleIds.map((roleId) => ({
          organizationId: context.organizationId,
          memberId,
          roleId,
          createdById: context.userId,
        })),
      );
    }
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "member.roles_assigned",
    target: { type: "member", id: target.userId },
    metadata: { memberId, roleIds: uniqueRoleIds },
  });
}

/** Üyenin bir kaynak/aksiyon grant'ını ayarlar. */
export async function setMemberPermission(
  context: AuthContext,
  memberId: string,
  resource: string,
  action: string,
  effect: PermissionEffect | "inherit",
): Promise<void> {
  requireOwner(context);

  if (!isResourceActionKey(`${resource}:${action}`)) {
    throw new PermissionError("Unknown resource or action.", "INVALID_INPUT");
  }

  const target = await getMemberInOrganization(context.organizationId, memberId);

  if (!target) {
    throw new PermissionError("Member not found in this organization.", "NOT_FOUND");
  }

  /*
   * Owner'ın yetkileri değiştirilemez. `deny` kaydı rolün üzerine yazdığı
   * için izin yönetimi de aynı korumayı taşımalıdır.
   */
  if (isOwnerRole(target.role)) {
    throw new PermissionError("The owner's permissions cannot be changed.", "FORBIDDEN");
  }

  await db.transaction(async (tx) => {
    if (effect === "inherit") {
      await tx
        .delete(memberPermission)
        .where(
          and(
            eq(memberPermission.organizationId, context.organizationId),
            eq(memberPermission.memberId, memberId),
            eq(memberPermission.resource, resource),
            eq(memberPermission.action, action),
          ),
        );

      return;
    }

    const updated = await tx
      .update(memberPermission)
      .set({ effect })
      .where(
        and(
          eq(memberPermission.organizationId, context.organizationId),
          eq(memberPermission.memberId, memberId),
          eq(memberPermission.resource, resource),
          eq(memberPermission.action, action),
        ),
      )
      .returning({ id: memberPermission.id });

    if (updated.length === 0) {
      await tx.insert(memberPermission).values({
        organizationId: context.organizationId,
        memberId,
        resource,
        action,
        effect,
        createdById: context.userId,
      });
    }
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: effect === "inherit" ? "permission.revoked" : "permission.granted",
    target: { type: "member", id: target.userId },
    metadata: { memberId, resource, action, effect },
  });
}

/** Üyenin efektif yetkileri. */
export async function getMemberEffectivePermissions(
  context: AuthContext,
  memberId: string,
): Promise<Record<string, Record<string, boolean>>> {
  const target = await getMemberInOrganization(context.organizationId, memberId);

  if (!target) {
    throw new PermissionError("Member not found in this organization.", "NOT_FOUND");
  }

  const input = await buildEvaluationInput(
    context.organizationId,
    memberId,
    isOwnerRole(target.role),
  );

  return getEffectivePermissions(input);
}

/** Üyenin efektif yetki listesi. */
export async function getMemberEffectivePermissionList(
  context: AuthContext,
  memberId: string,
): Promise<string[]> {
  const target = await getMemberInOrganization(context.organizationId, memberId);

  if (!target) {
    throw new PermissionError("Member not found in this organization.", "NOT_FOUND");
  }

  const input = await buildEvaluationInput(
    context.organizationId,
    memberId,
    isOwnerRole(target.role),
  );

  return getEffectivePermissionList(input);
}

/** Üyenin rol ve grant kayıtları (izin matrisi arayüzü için). */
export async function getMemberPermissionDetails(
  context: AuthContext,
  memberId: string,
): Promise<{ roleIds: string[]; grants: PermissionGrant[]; roleGrants: RoleGrant[] }> {
  const target = await getMemberInOrganization(context.organizationId, memberId);

  if (!target) {
    throw new PermissionError("Member not found in this organization.", "NOT_FOUND");
  }

  const [roleIds, grants, roleGrants] = await Promise.all([
    getMemberRoleIds(context.organizationId, memberId),
    getMemberGrants(context.organizationId, memberId),
    getMemberRoleGrants(context.organizationId, memberId),
  ]);

  return { roleIds, grants, roleGrants };
}

/** Davet rol id'lerini okur (sunucu tarafı saklanır). */
export async function getInvitationRoles(
  organizationId: string,
  invitationId: string,
): Promise<string[]> {
  return getInvitationRoleIds(organizationId, invitationId);
}

/** Organizasyondaki bir üyenin kaydı. */
async function getMemberInOrganization(
  organizationId: string,
  memberId: string,
): Promise<{ id: string; userId: string; role: string } | null> {
  const rows = await db
    .select({ id: member.id, userId: member.userId, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.id, memberId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Rolün izinlerini değiştirir (transaction içinde çağrılır). */
async function replaceRolePermissions(
  context: AuthContext,
  roleId: string,
  permissions: readonly { resource: string; action: string }[],
) {
  if (permissions.length === 0) {
    return;
  }

  await db.insert(organizationRolePermission).values(
    permissions.map((permission) => ({
      organizationId: context.organizationId,
      roleId,
      resource: permission.resource,
      action: permission.action,
    })),
  );
}
