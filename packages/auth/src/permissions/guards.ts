import "server-only";

import { type AuthContext, hasPermission, PermissionError, requireAuthContext } from "./service";

/**
 * Yetki korumaları.
 *
 * Bağlam sunucuda üretilir ve istemciden gelen değerlere güvenilmez. Yetki
 * yoksa `FORBIDDEN` hatası atılır; uygulama katmanı bu hatayı yönlendirmeye
 * çevirir.
 *
 * Layout tek güvenlik katmanı değildir: her server action ve her repository
 * sorgusu bu korumayı kendisi uygular.
 */

/** Oturum ve organizasyon erişimini zorunlu kılar. */
export async function requireOrganization(
  requestHeaders: Headers,
  organizationId?: string,
): Promise<AuthContext> {
  return requireAuthContext(requestHeaders, organizationId);
}

/** Belirli bir kaynak/aksiyon yetkisini zorunlu kılar. */
export async function requirePermission(
  context: AuthContext,
  resource: string,
  action: string,
): Promise<AuthContext> {
  if (!(await hasPermission(context, resource, action))) {
    throw new PermissionError(`Missing permission: ${resource}:${action}`, "FORBIDDEN");
  }

  return context;
}
