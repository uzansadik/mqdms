"use server";

import { assignMemberRoles } from "@mqdms/auth/permissions/server";
import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { invitationRole, organizationRole, project } from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { audit } from "@/features/audit/server";
import { requireRequestContext } from "@/features/auth/context";

export type OrganizationActionResult = { success: true } | { success: false; error: string };

const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),

  /**
   * Davet edilen üyeye verilecek fonksiyonel roller.
   *
   * Roller sunucu tarafında saklanır; istemci yalnızca organizasyona ait
   * rollerin id'lerini gönderebilir.
   */
  roleIds: z.array(z.string().trim().min(1)).max(20).default([]),
});

const assignMemberRolesSchema = z.object({
  memberId: z.string().trim().min(1),
  roleIds: z.array(z.string().trim().min(1)).max(20).default([]),
});

const removeMemberSchema = z.object({
  memberId: z.string().trim().min(1),
});

/**
 * Üye daveti.
 *
 * Davet better-auth'in organizasyon plugin'i üzerinden gönderilir; e-posta
 * kuyruğa `email.organization-invitation` işi olarak düşer. Fonksiyonel
 * roller `invitation_role` tablosunda saklanır ve davet kabul edildiğinde
 * üyeye atanır.
 */
export async function inviteMemberAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid invitation data." };
  }

  const { email, roleIds } = parsed.data;

  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "You are not allowed to invite members." };
  }

  const validRoleIds = await validateRoleIds(context.organizationId, roleIds);

  if (!validRoleIds) {
    return { success: false, error: "One or more roles do not belong to this organization." };
  }

  let invitationId: string;

  try {
    /*
     * better-auth 1.7.20'de davet endpoint'i `/organization/invite-member`
     * olsa da sunucu API adı `createInvitation`; istemci tarafındaki karşılığı
     * `authClient.organization.inviteMember`.
     *
     * better-auth yönetim rolü yalnızca `member` olabilir; fonksiyonel
     * roller `invitation_role` tablosunda tutulur.
     */
    const invitation = await auth.api.createInvitation({
      body: {
        email,
        role: "member",
        organizationId: context.organizationId,
      },
      headers: await headers(),
    });

    invitationId = invitation.id;
  } catch (error) {
    console.error("Failed to invite the member:", error);

    return { success: false, error: "Unable to send the invitation." };
  }

  if (validRoleIds.length > 0) {
    await db
      .insert(invitationRole)
      .values(
        validRoleIds.map((roleId) => ({
          organizationId: context.organizationId,
          invitationId,
          roleId,
        })),
      )
      .onConflictDoNothing({
        target: [invitationRole.invitationId, invitationRole.roleId],
      });
  }

  await audit({
    organizationId: context.organizationId,

    action: "member.invited",

    target: {
      type: "invitation",
      id: email,
    },

    metadata: {
      email,
      roleIds: validRoleIds,
      invitedById: context.member.id,
    },
  });

  return { success: true };
}

/** Üyenin fonksiyonel rollerini değiştirir. */
export async function assignMemberRolesAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = assignMemberRolesSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid role data." };
  }

  const { memberId, roleIds } = parsed.data;

  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "You are not allowed to change member roles." };
  }

  const validRoleIds = await validateRoleIds(context.organizationId, roleIds);

  if (!validRoleIds) {
    return { success: false, error: "One or more roles do not belong to this organization." };
  }

  try {
    await assignMemberRoles(context, memberId, validRoleIds);
  } catch (error) {
    console.error("Failed to assign the member roles:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the member roles.",
    };
  }

  return { success: true };
}

/** Üyeyi organizasyondan çıkarır. */
export async function removeMemberAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = removeMemberSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid member data." };
  }

  const { memberId } = parsed.data;

  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "You are not allowed to remove members." };
  }

  if (memberId === context.member.id) {
    return { success: false, error: "The owner cannot be removed." };
  }

  /*
   * Proje müdürü olarak atanmış bir üye doğrudan silinemez: `project`
   * tablosundaki composite FK, projenin organizasyonu ile üyenin
   * organizasyonunun eşleşmesini zorlar ve silme davranışı `no action`'dır.
   * Referans önce temizlenir; proje müdürü boşalır, proje korunur.
   */
  const releasedProjects = await db
    .update(project)
    .set({ projectManagerMemberId: null })
    .where(
      and(
        eq(project.organizationId, context.organizationId),
        eq(project.projectManagerMemberId, memberId),
      ),
    )
    .returning({ id: project.id });

  if (releasedProjects.length > 0) {
    await audit(
      {
        organizationId: context.organizationId,
        action: "project.managerReleased",
        target: { type: "member", id: memberId },
        metadata: { projectIds: releasedProjects.map((item) => item.id) },
      },
      db,
    );
  }

  try {
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: memberId,
        organizationId: context.organizationId,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to remove the member:", error);

    return { success: false, error: "Unable to remove the member." };
  }

  await audit({
    organizationId: context.organizationId,

    action: "member.removed",

    target: {
      type: "member",
      id: memberId,
    },
  });

  return { success: true };
}

/**
 * Rol id'lerinin organizasyona ait olduğunu doğrular.
 *
 * Geçersiz bir id varsa `null` döner: başka bir organizasyonun rolü
 * atanamaz.
 */
async function validateRoleIds(
  organizationId: string,
  roleIds: readonly string[],
): Promise<string[] | null> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: organizationRole.id })
    .from(organizationRole)
    .where(
      and(
        eq(organizationRole.organizationId, organizationId),
        inArray(organizationRole.id, uniqueRoleIds),
      ),
    );

  if (rows.length !== uniqueRoleIds.length) {
    return null;
  }

  return rows.map((row) => row.id);
}
