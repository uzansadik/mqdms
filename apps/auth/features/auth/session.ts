import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Oturumu cookie cache'i atlayarak veritabanından okur.
 *
 * better-auth `cookieCache` etkin olduğunda oturumu 60 saniye boyunca
 * cookie içinden döner. Bir kullanıcının rolü düşürüldüğü veya oturumu
 * düşürüldüğü anda cache geçersiz kalır; yetki kontrolü yapan çağrılar bu
 * fonksiyonu kullanmalıdır.
 */
export const getFreshSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireFreshSession() {
  const session = await getFreshSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function redirectIfAuthenticated(redirectTo = "/dashboard") {
  const session = await getSession();

  if (session) {
    redirect(redirectTo);
  }
}
