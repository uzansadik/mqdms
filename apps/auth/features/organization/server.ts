import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { member } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession, requireSession } from "@/features/auth/session";

export const getOrganizations = cache(async () => {
  const result = await auth.api.listOrganizations({
    headers: await headers(),
  });

  return result;
});

function hasRole(role: string | string[], targetRole: string) {
  const roles = Array.isArray(role) ? role : role.split(",").map((item) => item.trim());

  return roles.includes(targetRole);
}

/**
 * Oturumdaki kullanıcının aktif organizasyondaki üye kaydı.
 *
 * Oturumun cookie cache'inde aktif organizasyon yoksa (yeni giriş, cache
 * süresinin dolması) better-auth `NO_ACTIVE_ORGANIZATION` hatası fırlatır.
 * Bu durumda üye bilgisi organizasyon üzerinden bulunur; burada `null`
 * dönülür.
 */
export const getActiveOrganizationMember = cache(async () => {
  const session = await getSession();

  if (!session?.session.activeOrganizationId) {
    return null;
  }

  try {
    return await auth.api.getActiveMember({
      headers: await headers(),
    });
  } catch {
    return null;
  }
});

/**
 * Kullanıcının verilen organizasyondaki üye kaydı.
 *
 * Aktif organizasyon oturumda kayıtlı değilse üye bilgisi organizasyonun üye
 * listesinden bulunur.
 */
export async function getCurrentOrganizationMember(organizationId: string) {
  const activeMember = await getActiveOrganizationMember();

  if (activeMember) {
    return activeMember;
  }

  return getOrganizationMember(organizationId);
}

export async function requireOrganizationOwner() {
  const organization = await requireOrganization();
  const currentMember = await getCurrentOrganizationMember(organization.id);

  if (!currentMember || !hasRole(currentMember.role, "owner")) {
    redirect("/dashboard");
  }

  return {
    organization,
    member: currentMember,
  };
}

export const requireOrganization = cache(async () => {
  const session = await requireSession();
  const requestHeaders = await headers();
  const activeOrganizationId = session.session.activeOrganizationId;

  if (activeOrganizationId) {
    const organization = await auth.api.getOrganization({
      headers: requestHeaders,
      query: {
        organizationId: activeOrganizationId,
      },
    });

    if (organization) {
      return organization;
    }
  }

  const organizations = await getOrganizations();
  const organization = organizations[0];
  if (!organization) {
    redirect("/onboarding");
  }

  await auth.api.setActiveOrganization({
    headers: requestHeaders,
    body: {
      organizationId: organization.id,
    },
  });

  return organization;
});

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
  const session = await requireSession();

  /*
   * Üye kaydı doğrudan `member` tablosundan okunur. better-auth'in
   * `getFullOrganization` çağrısı ilk 100 üyeyi döndürdüğü için, büyük
   * organizasyonlarda sonraki üyeler listede görünmezdi ve yetkileri
   * "üye değil" gibi görünüyordu.
   */
  const rows = await db
    .select({ id: member.id, userId: member.userId, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)))
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
