import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { member } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { requireRequestContext } from "@/features/auth/context";

export const getOrganizations = cache(async () => {
  const result = await auth.api.listOrganizations({
    headers: await headers(),
  });

  return result;
});

/**
 * Kullanıcının üye olduğu organizasyonlar.
 *
 * Aktif organizasyon oturumda yazılı değilse üye bilgisi organizasyonun üye
 * listesinden bulunur.
 */
export async function getCurrentOrganizationMember(organizationId: string) {
  return getOrganizationMember(organizationId);
}

/**
 * Organizasyon sahibi olmayı zorunlu kılar.
 *
 * Organizasyon yönetimi owner-only'dir: member rolü yönetim ekranlarına
 * erişemez.
 */
export async function requireOrganizationOwner(returnTo?: string) {
  const context = await requireRequestContext({ returnTo });

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  return context;
}

export const getOrganizationDetails = cache(async (organizationId: string) => {
  const result = await auth.api.getFullOrganization({
    headers: await headers(),
    query: {
      organizationId,
      membersLimit: 100,
    },
  });

  return result;
});

/** Oturumdaki kullanıcının verilen organizasyondaki üye kaydı. */
export async function getOrganizationMember(organizationId: string) {
  const context = await requireRequestContext({ organizationId });

  const rows = await db
    .select({ id: member.id, userId: member.userId, role: member.role })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.userId, context.userId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Verilen organizasyondaki belirli bir üyenin kaydı. */
export const getOrganizationMemberById = cache(async (organizationId: string, memberId: string) => {
  const rows = await db
    .select({ id: member.id, userId: member.userId, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.id, memberId)))
    .limit(1);

  return rows[0] ?? null;
});

export const getOrganizationInvitations = cache(async (organizationId: string) => {
  const result = await auth.api.listInvitations({
    headers: await headers(),
    query: {
      organizationId,
    },
  });

  return result;
});
