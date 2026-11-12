import { listOrganizationMembers } from "@mqdms/auth/permissions/server";
import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { requireRequestContext } from "@/features/auth/context";
import { DeleteOrganization } from "@/features/organization/delete-organization";
import { OrganizationSettingsForm } from "@/features/organization/organization-settings-form";

export default async function OrganizationPage() {
  const t = await getTranslations();

  const context = await requireRequestContext();

  const members = await listOrganizationMembers(context.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("organization.general.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {t("organization.general.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("organization.general.name")}</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="truncate text-2xl font-semibold">{context.organization.name}</p>

            <p className="text-xs text-muted-foreground">{context.organization.slug}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("organization.general.members")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">{members.length}</p>

            <p className="text-xs text-muted-foreground">{t("organization.general.owner")}</p>

            <Badge className="mt-2" variant="secondary">
              {context.member.role}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {context.isOwner && (
        <>
          <OrganizationSettingsForm
            organization={{
              id: context.organization.id,
              name: context.organization.name,
              slug: context.organization.slug,
              logo: context.organization.logo,
            }}
          />

          <DeleteOrganization organizationName={context.organization.name} />
        </>
      )}
    </div>
  );
}
