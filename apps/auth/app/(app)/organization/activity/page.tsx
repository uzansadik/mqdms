import { redirect } from "next/navigation";
import { getAuditLogs } from "@/features/audit/get-audit-logs";
import { requireRequestContext } from "@/features/auth/context";

export default async function ActivityPage() {
  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  const logs = await getAuditLogs(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>

        <p className="text-sm text-muted-foreground">Recent activity in your organization.</p>
      </div>

      <div className="divide-y rounded-lg border">
        {logs.map((log) => (
          <div className="p-4" key={log.id}>
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

    case "member.roles_assigned":
      return "changed member roles";

    case "member.removed":
      return "removed a member";

    case "role.created":
      return "created a role";

    case "role.updated":
      return "updated a role";

    case "role.deleted":
      return "deleted a role";

    case "permission.granted":
      return "granted a permission";

    case "permission.revoked":
      return "revoked a permission";

    case "api_key.created":
      return "created an API key";

    case "api_key.revoked":
      return "revoked an API key";

    default:
      return action;
  }
}
