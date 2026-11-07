import { ApiKeysSection } from "@/features/api-keys/api-keys-section";
import { requireOrganizationOwner } from "@/features/organization/server";

export default async function ApiKeysPage() {
  const { organization } = await requireOrganizationOwner();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>

        <p className="text-sm text-muted-foreground">
          Create and manage API keys for your organization.
        </p>
      </div>

      <ApiKeysSection organizationId={organization.id} />
    </div>
  );
}
