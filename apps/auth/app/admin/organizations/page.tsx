import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import Link from "next/link";

import { DeleteOrganizationButton } from "@/features/admin/components/delete-organization-button";
import { listAllOrganizations, requireSuperadmin } from "@/features/admin/server";

export default async function AdminOrganizationsPage() {
  const t = await getTranslations();

  // Sayfa kendi yetki kontrolünü yapar (layout ile paralel render ediliyor).
  await requireSuperadmin();

  const organizations = await listAllOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.organizations.title")}
          </h1>

          <p className="mt-1 text-muted-foreground">{t("admin.organizations.description")}</p>
        </div>

        <Button asChild>
          <Link href="/admin/organizations/new">{t("admin.overview.newOrganization")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.organizations.all")}</CardTitle>

          <CardDescription>
            {t("admin.organizations.count", { count: organizations.length })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {organizations.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("admin.organizations.empty")}</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.organizations.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {organizations.map((organization) => (
                <div className="flex items-center gap-4 p-4" key={organization.id}>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="truncate font-medium hover:underline"
                      href={`/admin/organizations/${organization.id}`}
                    >
                      {organization.name}
                    </Link>

                    <p className="truncate text-sm text-muted-foreground">{organization.slug}</p>
                  </div>

                  <Badge className="capitalize" variant="secondary">
                    {t("admin.organizations.memberCount", {
                      count: organization.memberCount,
                    })}
                  </Badge>

                  <p className="hidden text-sm text-muted-foreground sm:block">
                    {organization.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  <DeleteOrganizationButton
                    name={organization.name}
                    organizationId={organization.id}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
