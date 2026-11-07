import { DeleteOrganization } from "@/features/organization/delete-organization";
import { OrganizationSettingsForm } from "@/features/organization/organization-settings-form";
import { requireOrganizationOwner } from "@/features/organization/server";

export default async function SettingsPage() {
  const { organization } = await requireOrganizationOwner();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">General</h1>

        <p className="text-sm text-muted-foreground">
          Manage your organization details and branding.
        </p>
      </div>

      <OrganizationSettingsForm
        organization={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo ?? undefined,
        }}
      />
      <DeleteOrganization organizationId={organization.id} organizationName={organization.name} />
    </div>
  );
}
