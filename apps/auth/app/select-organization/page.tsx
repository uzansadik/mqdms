import { env } from "@mqdms/env/client";
import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { getSession } from "@/features/auth/session";
import { SelectOrganizationList } from "@/features/organization/select-organization-list";
import { getOrganizations } from "@/features/organization/server";

export const dynamic = "force-dynamic";

/**
 * Organizasyon seçim ekranı.
 *
 * Kullanıcının birden fazla organizasyona üyeliği varsa aktif organizasyon
 * seçilmelidir. Aktif organizasyon her işlemde yeniden doğrulanır.
 *
 * Seçim sonrası kullanıcı iş uygulamasına yönlendirilir.
 */
export default async function SelectOrganizationPage() {
  const t = await getTranslations();

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const organizations = await getOrganizations();

  if (organizations.length <= 1) {
    redirect(env.NEXT_PUBLIC_BUSINESS_APP_URL);
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("organization.select.title")}</CardTitle>

          <CardDescription>{t("organization.select.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <SelectOrganizationList
            organizations={organizations.map((organization) => ({
              id: organization.id,
              name: organization.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
