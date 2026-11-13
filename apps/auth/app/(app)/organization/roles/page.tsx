import { listOrganizationRoles } from "@mqdms/auth/permissions/server";
import { getTranslations } from "@mqdms/i18n/server";
import { redirect } from "next/navigation";

import { requireRequestContext } from "@/features/auth/context";
import { FactorySeedUpgrade } from "@/features/permissions/components/factory-seed-upgrade";
import { RoleManager } from "@/features/permissions/components/role-manager";

export default async function RolesPage() {
  const t = await getTranslations();

  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  const roles = await listOrganizationRoles(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.nav.roles")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("organization.roles.description")}</p>
      </div>

      <RoleManager
        roles={roles.map((role) => ({
          id: role.id,
          slug: role.slug,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
        }))}
      />

      <FactorySeedUpgrade />
    </div>
  );
}
