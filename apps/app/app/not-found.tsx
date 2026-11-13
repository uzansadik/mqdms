import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import Link from "next/link";

/**
 * 404 sayfası.
 *
 * Kayıt bulunamadığında veya başka organizasyona ait bir kayıt id'si
 * kullanıldığında gösterilir: "bulunamadı" bilgisi sızdırılmaz.
 */
export default async function NotFound() {
  const t = await getTranslations();

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("common.notFound.title")}</CardTitle>

          <CardDescription>{t("common.notFound.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">{t("common.notFound.back")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
