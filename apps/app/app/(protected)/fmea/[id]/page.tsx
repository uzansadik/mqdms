import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { requirePermission } from "@/features/auth/session";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * FMEA detayı.
 *
 * Bu bir **yer tutucudur**: rota ve erişim koruması hazırdır, ancak henüz
 * FMEA kaydının işlevi uygulanmamıştır.
 */
export default async function FmeaDetailPage({ params }: PageProps) {
  const t = await getTranslations();

  const { id } = await params;

  await requirePermission("fmea", "read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("app.modules.fmea.detail")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.modules.fmea.placeholder.title")}</CardTitle>

          <CardDescription>{t("app.modules.fmea.placeholder.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{t("app.modules.fmea.placeholder.note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
