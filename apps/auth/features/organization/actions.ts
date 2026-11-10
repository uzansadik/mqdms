"use server";

import {
  assignableRoleIds,
  hasOrganizationStatement,
  parseRoles,
  type RoleId,
} from "@mqdms/auth/permissions";
import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { z } from "zod";

import { audit } from "@/features/audit/server";
import { getOrganizationMember, getOrganizationMemberById } from "@/features/organization/server";

export type OrganizationActionResult = { success: true } | { success: false; error: string };

const assignableRoleSchema = z.enum(assignableRoleIds as [RoleId, ...RoleId[]]);

const inviteMemberSchema = z.object({
  organizationId: z.string().trim().min(1),
  email: z.string().trim().email("Enter a valid email address."),
  role: assignableRoleSchema,
});

const updateMemberRoleSchema = z.object({
  organizationId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
  role: assignableRoleSchema,
});

const removeMemberSchema = z.object({
  organizationId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
});

/**
 * Üye daveti.
 *
 * Davet better-auth'in organizasyon plugin'i üzerinden gönderilir; e-posta
 * kuyruğa `email.organization-invitation` işi olarak düşer.
 */
export async function inviteMemberAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid invitation data." };
  }

  const { organizationId, email, role } = parsed.data;

  const member = await getOrganizationMember(organizationId);

  if (!member || !hasOrganizationStatement({ role: member.role, statement: "inviteMember" })) {
    return { success: false, error: "You are not allowed to invite members." };
  }

  try {
    /*
     * better-auth 1.7.1'de davet endpoint'i `/organization/invite-member`
     * olsa da sunucu API adı `createInvitation`; istemci tarafındaki karşılığı
     * `authClient.organization.inviteMember`.
     */
    await auth.api.createInvitation({
      body: {
        email,
        role,
        organizationId,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to invite the member:", error);

    return { success: false, error: "Unable to send the invitation." };
  }

  await audit({
    organizationId,

    action: "member.invited",

    target: {
      type: "invitation",
      id: email,
    },

    metadata: {
      email,
      role,
      invitedById: member.id,
    },
  });

  return { success: true };
}

/** Üyenin rolünü değiştirir. Roller katalogdan gelir, `owner` atanamaz. */
export async function updateMemberRoleAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid role data." };
  }

  const { organizationId, memberId, role } = parsed.data;

  const member = await getOrganizationMember(organizationId);

  if (!member || !hasOrganizationStatement({ role: member.role, statement: "updateMemberRole" })) {
    return { success: false, error: "You are not allowed to change member roles." };
  }

  const target = await getOrganizationMemberById(organizationId, memberId);

  if (!target) {
    return { success: false, error: "Member not found in this organization." };
  }

  /*
   * Owner rolü bu ekrandan değiştirilemez: organizasyonun sahibi başka bir
   * üyeye devredilmeden korunur.
   */
  if (parseRoles(target.role).includes("owner")) {
    return { success: false, error: "The owner role cannot be changed here." };
  }

  try {
    await auth.api.updateMemberRole({
      body: {
        memberId,
        organizationId,
        role,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to update the member role:", error);

    return { success: false, error: "Unable to update the member role." };
  }

  await audit({
    organizationId,

    action: "member.role_changed",

    target: {
      type: "member",
      id: memberId,
    },

    metadata: {
      role,
    },
  });

  return { success: true };
}

/** Üyeyi organizasyondan çıkarır. */
export async function removeMemberAction(input: unknown): Promise<OrganizationActionResult> {
  const parsed = removeMemberSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid member data." };
  }

  const { organizationId, memberId } = parsed.data;

  const member = await getOrganizationMember(organizationId);

  if (!member || !hasOrganizationStatement({ role: member.role, statement: "removeMember" })) {
    return { success: false, error: "You are not allowed to remove members." };
  }

  const target = await getOrganizationMemberById(organizationId, memberId);

  if (!target) {
    return { success: false, error: "Member not found in this organization." };
  }

  if (parseRoles(target.role).includes("owner")) {
    return { success: false, error: "The owner cannot be removed." };
  }

  try {
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: memberId,
        organizationId,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to remove the member:", error);

    return { success: false, error: "Unable to remove the member." };
  }

  await audit({
    organizationId,

    action: "member.removed",

    target: {
      type: "member",
      id: memberId,
    },
  });

  return { success: true };
}
