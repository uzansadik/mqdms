import { getTranslations } from "@mqdms/i18n/server";

import { requireSuperadmin } from "@/features/admin/server";
import { OAuthClientsSection } from "@/features/oauth/oauth-clients-section";
import { listOAuthClients } from "@/features/oauth/server";

/**
 * Tüketen uygulama (OAuth client) kayıtlarının yönetimi.
 *
 * Bu uygulamalar merkezi kimlik yöneticisine bağlanır; roller ve izinler
 * token claim'leri olarak yayınlanır.
 */
export default async function AdminOAuthClientsPage() {
  const t = await getTranslations();

  // Sayfa kendi yetki kontrolünü yapar (layout ile paralel render ediliyor).
  await requireSuperadmin();

  const clients = await listOAuthClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.oauthClients.pageTitle")}
        </h1>

        <p className="mt-1 text-muted-foreground">{t("admin.oauthClients.pageDescription")}</p>
      </div>

      <OAuthClientsSection clients={clients} />
    </div>
  );
}
