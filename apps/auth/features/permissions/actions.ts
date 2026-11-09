"use server";

import { isResourceActionKey } from "@mqdms/auth/permissions";
import { db } from "@mqdms/db";
import { member, memberPermission } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { audit } from "@/features/audit/server";
import { getSession } from "@/features/auth/session";
import { requireOrganization } from "@/features/organization/server";

import { canManagePermissions } from "./server";

const setPermissionSchema = z.object({
  memberId: z.string().trim().min(1),

  resource: z.string().trim().min(1),
  action: z.string().trim().min(1),

  /** `inherit` grant kaydını siler ve role geri döner. */
  effect: z.enum(["allow", "deny", "inherit"]),
});

export type SetPermissionResult = { success: true } | { success: false; error: string };

export async function setMemberPermissionAction(input: unknown): Promise<SetPermissionResult> {
  const parsed = setPermissionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid permission data." };
  }

  const { memberId, resource, action, effect } = parsed.data;

  if (!isResourceActionKey(`${resource}:${action}`)) {
    return { success: false, error: "Unknown resource or action." };
  }

  if (!(await canManagePermissions())) {
    return { success: false, error: "You are not allowed to manage permissions." };
  }

  const organization = await requireOrganization();

  const target = await db
    .select({ id: member.id, userId: member.userId })
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.organizationId, organization.id)))
    .limit(1);

  const targetMember = target[0];

  if (!targetMember) {
    return { success: false, error: "Member not found in this organization." };
  }

  const existing = await db
    .select({ id: memberPermission.id })
    .from(memberPermission)
    .where(
      and(
        eq(memberPermission.memberId, memberId),
        eq(memberPermission.resource, resource),
        eq(memberPermission.action, action),
      ),
    )
    .limit(1);

  const existingGrant = existing[0];

  if (effect === "inherit") {
    if (existingGrant) {
      await db.delete(memberPermission).where(eq(memberPermission.id, existingGrant.id));
    }
  } else if (existingGrant) {
    await db
      .update(memberPermission)
      .set({ effect })
      .where(eq(memberPermission.id, existingGrant.id));
  } else {
    const session = await getSession();

    await db.insert(memberPermission).values({
      organizationId: organization.id,
      memberId,
      resource,
      action,
      effect,
      createdById: session?.user.id,
    });
  }

  await audit({
    organizationId: organization.id,

    action: effect === "inherit" ? "permission.revoked" : "permission.granted",

    target: {
      type: "member",
      id: targetMember.userId,
    },

    metadata: {
      memberId,
      resource,
      action,
      effect,
    },
  });

  return { success: true };
}
