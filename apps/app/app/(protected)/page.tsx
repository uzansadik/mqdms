import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { canAccess, requireAuthContext } from "@/features/auth/session";

export default async function DashboardPage() {
  const t = await getTranslations();

  const context = await requireAuthContext();

  const modules = [
    {
      key: "fmea",
      title: t("app.modules.fmea.title"),
      description: t("app.modules.fmea.description"),
      allowed: await canAccess(context, "fmea", "read"),
    },
    {
      key: "synoptic",
      title: t("app.modules.synoptic.title"),
      description: t("app.modules.synoptic.description"),
      allowed: await canAccess(context, "synoptic", "read"),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("app.dashboard.welcome", { name: context.user.name ?? context.user.email })}
        </h1>

        <p className="mt-1 text-muted-foreground">
          {t("app.dashboard.description", { organization: context.organization.name })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.key}>
            <CardHeader>
              <CardTitle className="text-base">{module.title}</CardTitle>

              <CardDescription>{module.description}</CardDescription>
            </CardHeader>

            <CardContent>
              {module.allowed ? (
                <Badge variant="secondary">{t("app.modules.available")}</Badge>
              ) : (
                <Badge variant="outline">{t("app.modules.noAccess")}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
