import { getAuditLogs } from "@/features/audit/get-audit-logs";
import { requireOrganization } from "@/features/organization/server";

export default async function ActivityPage() {
  const organization = await requireOrganization();

  const logs = await getAuditLogs(organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>

        <p className="text-sm text-muted-foreground">Recent activity in your organization.</p>
      </div>

      <div className="divide-y rounded-lg border">
        {logs.map((log) => (
          <div key={log.id} className="p-4">
            <p className="text-sm">
              <strong>{log.actor?.name ?? "Unknown user"}</strong> {formatAuditAction(log.action)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">{log.createdAt.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAuditAction(action: string) {
  switch (action) {
    case "organization.updated":
      return "updated organization settings";

    case "member.invited":
      return "invited a member";

    case "member.role_changed":
      return "changed a member role";

    case "member.removed":
      return "removed a member";
    case "api_key.created":
      return "created an API key";

    case "api_key.revoked":
      return "revoked an API key";

    default:
      return action;
  }
}
