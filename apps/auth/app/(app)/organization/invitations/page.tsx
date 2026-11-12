import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { requireRequestContext } from "@/features/auth/context";
import { CancelInvitationButton } from "@/features/organization/cancel-invitation-button";
import { getOrganizationInvitations } from "@/features/organization/server";

export default async function InvitationsPage() {
  const t = await getTranslations();

  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  const invitations = await getOrganizationInvitations(context.organizationId);

  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("organization.members.invitations.title")}</CardTitle>

          <CardDescription>{t("organization.members.invitations.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          {pendingInvitations.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("organization.members.invitations.empty")}</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t("organization.members.invitations.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {pendingInvitations.map((invitation) => (
                <div className="flex items-center gap-4 p-4" key={invitation.id}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {invitation.email.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{invitation.email}</p>

                    <p className="text-sm text-muted-foreground">
                      {t("organization.members.invitations.expires", {
                        date: new Date(invitation.expiresAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>

                  <Badge variant="secondary">{t("organization.members.invitations.pending")}</Badge>

                  <CancelInvitationButton email={invitation.email} invitationId={invitation.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
