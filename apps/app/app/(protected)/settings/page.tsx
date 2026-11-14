import { getTranslations } from "@mqdms/i18n/server";
import { LanguageSelect } from "@mqdms/i18n/language-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { requireAuthContext } from "@/features/auth/session";
import { ThemeSelect } from "@/features/shell/theme-select";

/**
 * Uygulama ayarları.
 *
 * Şu an dil ve tema tercihleri sunar. Tercihler tarayıcıda saklanır ve
 * bir sonraki istekte uygulanır.
 */
export default async function SettingsPage() {
  await requireAuthContext();

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("app.settings.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("app.settings.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("app.settings.language.title")}</CardTitle>

            <CardDescription>{t("app.settings.language.description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <LanguageSelect />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("app.settings.theme.title")}</CardTitle>

            <CardDescription>{t("app.settings.theme.description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <ThemeSelect
              labels={{
                light: t("app.settings.theme.light"),
                dark: t("app.settings.theme.dark"),
                system: t("app.settings.theme.system"),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
