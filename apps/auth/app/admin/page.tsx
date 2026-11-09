import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Building2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { getPlatformStats, listAllOrganizations, requireSuperadmin } from "@/features/admin/server";

export default async function AdminOverviewPage() {
  const t = await getTranslations();

  /*
   * Layout zaten superadmin kontrolü yapıyor; sayfa da kendi kontrolünü
   * yapar. Layout ve sayfa paralel render edildiği için yetki kontrolü
   * veriye erişmeden önce burada da tekrarlanır.
   */
  await requireSuperadmin();

  const [stats, organizations] = await Promise.all([getPlatformStats(), listAllOrganizations()]);

  const recentOrganizations = organizations.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("admin.overview.title")}</h1>

          <p className="mt-1 text-muted-foreground">{t("admin.overview.description")}</p>
        </div>

        <Button asChild>
          <Link href="/admin/organizations/new">{t("admin.overview.newOrganization")}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.stats.organizations")}</CardTitle>

            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">{stats.organizationCount}</div>

            <p className="text-xs text-muted-foreground">
              {t("admin.stats.organizationsDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.stats.users")}</CardTitle>

            <Users className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">{stats.userCount}</div>

            <p className="text-xs text-muted-foreground">{t("admin.stats.usersDescription")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.stats.memberships")}</CardTitle>

            <Users className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">{stats.memberCount}</div>

            <p className="text-xs text-muted-foreground">
              {t("admin.stats.membershipsDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.stats.superadmins")}</CardTitle>

            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">{stats.superadminCount}</div>

            <p className="text-xs text-muted-foreground">
              {t("admin.stats.superadminsDescription")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.overview.recent")}</CardTitle>

          <CardDescription>{t("admin.overview.recentDescription")}</CardDescription>
        </CardHeader>

        <CardContent>
          {recentOrganizations.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("admin.overview.empty")}</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.overview.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {recentOrganizations.map((organization) => (
                <div className="flex items-center gap-4 p-4" key={organization.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{organization.name}</p>

                    <p className="truncate text-sm text-muted-foreground">{organization.slug}</p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t("admin.organizations.memberCount", {
                      count: organization.memberCount,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
