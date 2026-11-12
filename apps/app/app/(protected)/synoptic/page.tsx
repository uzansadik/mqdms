import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { requirePermission } from "@/features/auth/session";

/**
 * Sinoptik ekranı.
 *
 * Bu bir **yer tutucudur**: rota ve erişim koruması hazırdır, ancak henüz
 * sinoptik düzenleyicinin işlevi uygulanmamıştır.
 */
export default async function SynopticPage() {
  const t = await getTranslations();

  await requirePermission("synoptic", "read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("app.modules.synoptic.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {t("app.modules.synoptic.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.modules.synoptic.placeholder.title")}</CardTitle>

          <CardDescription>{t("app.modules.synoptic.placeholder.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("app.modules.synoptic.placeholder.note")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
