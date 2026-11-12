import type { AuthContext } from "@mqdms/auth/permissions/server";
import { getAuthContext } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { member } from "@mqdms/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession } from "@/features/auth/session";

/**
 * İstek bağlamı.
 *
 * Bağlam **her zaman sunucuda** üretilir; istemciden gelen bir bağlama
 * güvenilmez. İçinde oturum, aktif organizasyon, üye kaydı ve owner durumu
 * bulunur.
 */
export const getRequestContext = cache(async (organizationId?: string) => {
  return getAuthContext(await headers(), organizationId);
});

/**
 * İstek bağlamını zorunlu kılar.
 *
 * Oturum yoksa girişe, organizasyon erişimi yoksa erişim ekranına
 * yönlendirir.
 */
export async function requireRequestContext(
  options: { organizationId?: string; returnTo?: string } = {},
): Promise<AuthContext> {
  const context = await getRequestContext(options.organizationId);

  if (context) {
    return context;
  }

  const session = await requireSessionOrNull(options.returnTo);

  if (!session) {
    redirect("/login");
  }

  /*
   * Kullanıcı giriş yapmış ama aktif organizasyona erişemiyor. Bu iki
   * durumda olabilir: hiçbir organizasyonun üyesi değil (davet bekliyor) ya
   * da birden fazla organizasyonun üyesi (seçim gerekiyor).
   */
  const memberships = await countMemberships(session.user.id);

  if (memberships > 1) {
    redirect("/select-organization");
  }

  redirect("/no-access");
}

/** Kullanıcının üye olduğu organizasyon sayısı. */
export const countMemberships = cache(async (userId: string) => {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, userId));

  return rows.length;
});

async function requireSessionOrNull(returnTo?: string) {
  const session = await getSession();

  if (!session && returnTo) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
