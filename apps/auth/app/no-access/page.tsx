import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { getSession } from "@/features/auth/session";

export const dynamic = "force-dynamic";

/**
 * Organizasyon erişimi olmayan kullanıcılar için bilgilendirme ekranı.
 *
 * Hesap açmış ancak hiçbir organizasyona üye olmayan kullanıcı buraya düşer:
 * bir davet bekler.
 */
export default async function NoAccessPage() {
  const t = await getTranslations();

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.noWorkspace.title")}</CardTitle>

          <CardDescription>{t("onboarding.noWorkspace.description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("onboarding.noWorkspace.hint")}</p>

          <p>{t("onboarding.noWorkspace.waiting")}</p>

          <Button asChild className="mt-4" variant="outline">
            <a href="/api/auth/sign-out">Sign out</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
