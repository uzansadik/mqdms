import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { getOrganizations } from "@/features/organization/server";

export default async function OnboardingPage() {
  const t = await getTranslations();

  const session = await requireSession();

  /*
   * Superadmin platform seviyesinde çalışır; organizasyon üyesi değildir.
   * Kendi paneline yönlendirilir.
   */
  if (session.user.role === "superadmin") {
    redirect("/admin");
  }

  const organizations = await getOrganizations();

  if (organizations.length > 0) {
    redirect("/dashboard");
  }

  /*
   * Self-serve organizasyon açma kapatıldı: organizasyonu yalnızca superadmin
   * açabilir. Kullanıcı bir davet bekliyor.
   */
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("onboarding.noWorkspace.title")}</CardTitle>

        <CardDescription>{t("onboarding.noWorkspace.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{t("onboarding.noWorkspace.hint")}</p>

        <p>{t("onboarding.noWorkspace.waiting")}</p>
      </CardContent>
    </Card>
  );
}
