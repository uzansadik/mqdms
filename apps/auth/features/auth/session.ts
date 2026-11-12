import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Oturumu okur.
 *
 * Cookie cache ilk sürümde kapalıdır; oturum her çağrıda veritabanından
 * okunur. Bir üyenin yetkisi düşürüldüğü anda karar eski kalmaz.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Oturum zorunluluğu.
 *
 * Oturum yoksa giriş ekranına yönlendirir. `returnTo` hedefi korunur ki
 * kullanıcı girişten sonra kaldığı yere dönsün.
 */
export async function requireSession(returnTo?: string) {
  const session = await getSession();

  if (!session) {
    if (returnTo) {
      redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }

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
