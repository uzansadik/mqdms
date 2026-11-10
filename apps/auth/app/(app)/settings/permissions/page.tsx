import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { getOrganizationDetails, requireOrganization } from "@/features/organization/server";
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix";
import { getOrganizationGrants, requirePermissionManager } from "@/features/permissions/server";

export default async function PermissionsPage() {
  const t = await getTranslations();

  await requirePermissionManager();

  const organization = await requireOrganization();

  const [details, grants] = await Promise.all([
    getOrganizationDetails(organization.id),
    getOrganizationGrants(organization.id),
  ]);

  const members = (details?.members ?? []).map((member) => ({
    memberId: member.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    grants: grants
      .filter((grant) => grant.memberId === member.id)
      .map((grant) => ({
        resource: grant.resource,
        action: grant.action,
        effect: grant.effect,
      })),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.title")}</CardTitle>

          <CardDescription>{t("permissions.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <PermissionMatrix members={members} />
        </CardContent>
      </Card>
    </div>
  );
}
