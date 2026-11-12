import {
  type AuthContext,
  getAuthContext,
  hasPermission,
} from "@mqdms/auth/permissions/server";
import { env } from "@mqdms/env/client";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

/**
 * İstek bağlamı.
 *
 * Bağlam sunucuda üretilir; istemciden gelen bir bağlama güvenilmez. İki web
 * deploy'u aynı Better Auth config'ini, secret'ı ve veritabanını paylaştığı
 * için oturum her iki uygulamada da aynıdır.
 */
export const getRequestContext = cache(async () => {
  return getAuthContext(await headers());
});

/**
 * Oturum ve organizasyon erişimini zorunlu kılar.
 *
 * Oturum yoksa auth ekranına, organizasyon erişimi yoksa uyarı ekranına
 * yönlendirir.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getRequestContext();

  if (!context) {
    redirect(new URL("/login", env.NEXT_PUBLIC_AUTH_URL).toString());
  }

  return context;
}

/**
 * Belirli bir kaynak/aksiyon yetkisini zorunlu kılar.
 *
 * Layout tek güvenlik katmanı değildir: her server action ve repository
 * sorgusu bu kontrolü kendisi uygular. Yetki yoksa Next.js 403 sayfası
 * gösterilir.
 */
export async function requirePermission(
  resource: string,
  action: string,
): Promise<AuthContext> {
  const context = await requireAuthContext();

  if (!(await hasPermission(context, resource, action))) {
    forbidden();
  }

  return context;
}

/**
 * Yetki yoksa listeden sessizce çıkar.
 *
 * Menü görünürlüğü yalnızca UX'tir; gerçek kontrol `requirePermission` ile
 * yapılır.
 */
export async function canAccess(
  context: AuthContext,
  resource: string,
  action: string,
): Promise<boolean> {
  return hasPermission(context, resource, action);
}
