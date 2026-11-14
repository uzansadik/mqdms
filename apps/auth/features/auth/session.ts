import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getOrganizations } from "@/features/organization/server";

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

/**
 * Oturum varsa hedefe yönlendirir.
 *
 * Organizasyon erişimi yoksa iş uygulamasına yönlendirme **yapılmaz**: iş
 * uygulaması kullanıcıyı geri giriş ekranına gönderir ve yönlendirme döngüsü
 * oluşur. Böyle durumlarda organizasyon seçimine ya da erişim uyarısına
 * gidilir.
 */
export async function redirectIfAuthenticated(redirectTo = "/dashboard") {
  const session = await getSession();

  if (!session) {
    return;
  }

  const organizations = await getOrganizations();

  if (organizations.length === 0) {
    redirect("/no-access");
  }

  /*
   * Birden fazla organizasyona üye olup aktif organizasyon **geçerli bir
   * üyeliğe** karşılık gelmiyorsa seçim ekranı gerekir.
   *
   * Oturum, kullanıcı ayrıldığı organizasyonun id'sini taşıyor olabilir;
   * bu durumda iş uygulaması bağlamı çözemez ve kullanıcı seçim ekranına
   * gidemez. Tek organizasyon durumunda iş uygulaması üyeliği kendisi çözer.
   */
  const activeOrganizationId = session.session.activeOrganizationId;

  const hasValidActiveOrganization =
    typeof activeOrganizationId === "string" &&
    organizations.some((organization) => organization.id === activeOrganizationId);

  if (organizations.length > 1 && !hasValidActiveOrganization) {
    redirect("/select-organization");
  }

  redirect(redirectTo);
}
