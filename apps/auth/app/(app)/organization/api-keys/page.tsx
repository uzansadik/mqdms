import { redirect } from "next/navigation";
import { ApiKeysSection } from "@/features/api-keys/api-keys-section";
import { requireRequestContext } from "@/features/auth/context";

export default async function ApiKeysPage() {
  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>

        <p className="text-sm text-muted-foreground">
          Create and manage API keys for your organization.
        </p>
      </div>

      <ApiKeysSection organizationId={context.organizationId} />
    </div>
  );
}
