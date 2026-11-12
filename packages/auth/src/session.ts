import "server-only";

import { auth } from "./server";

/**
 * Oturum okuma yardımcıları.
 *
 * Bu modül sunucu tarafıdır ve framework'e bağlı değildir: istek başlıkları
 * çağıran taraf (`next/headers` vb.) sağlar.
 */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  id: string;
  activeOrganizationId?: string | null;
};

export type SessionData = {
  session: AuthSession;
  user: AuthUser;
};

/**
 * Oturumu okur.
 *
 * Cookie cache ilk sürümde kapalı olduğu için oturum her çağrıda
 * veritabanından okunur; bir üyenin yetkisi düşürüldüğü anda karar eski
 * kalmaz.
 */
export async function getSession(requestHeaders: Headers): Promise<SessionData | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return null;
  }

  return {
    session: {
      id: session.session.id,
      activeOrganizationId: session.session.activeOrganizationId,
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  };
}

/** Oturumun aktif organizasyon id'si. */
export function getActiveOrganizationId(session: SessionData | null): string | undefined {
  const value = session?.session.activeOrganizationId;

  return typeof value === "string" && value.length > 0 ? value : undefined;
}
