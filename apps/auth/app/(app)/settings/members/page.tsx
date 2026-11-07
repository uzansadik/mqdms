import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { requireSession } from "@/features/auth/session";
import { CancelInvitationButton } from "@/features/organization/cancel-invitation-button";
import { InviteMemberForm } from "@/features/organization/invite-member-form";
import { MemberActions } from "@/features/organization/member-actions";
import {
  getOrganizationDetails,
  getOrganizationInvitations,
  requireOrganization,
} from "@/features/organization/server";

export default async function MembersPage() {
  const session = await requireSession();
  const organization = await requireOrganization();

  const details = await getOrganizationDetails(organization.id);

  if (!details) {
    return null;
  }

  const currentMember = details.members.find((member) => member.userId === session.user.id);

  const roles = currentMember?.role.split(",") ?? [];

  const canManageMembers = roles.includes("owner") || roles.includes("admin");
  const invitations = canManageMembers ? await getOrganizationInvitations(organization.id) : [];

  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>

            <CardDescription>Invite someone to join {organization.name}.</CardDescription>
          </CardHeader>

          <CardContent>
            <InviteMemberForm organizationId={organization.id} />
          </CardContent>
        </Card>
      )}
      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>

            <CardDescription>Invitations waiting to be accepted.</CardDescription>
          </CardHeader>

          <CardContent>
            {pendingInvitations.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No pending invitations</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Invitations you send will appear here.
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
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Badge className="capitalize" variant="outline">
                      {invitation.role}
                    </Badge>

                    <Badge variant="secondary">Pending</Badge>

                    <CancelInvitationButton email={invitation.email} invitationId={invitation.id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>

          <CardDescription>
            {details.members.length} workspace {details.members.length === 1 ? "member" : "members"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="divide-y rounded-md border">
            {details.members.map((member) => {
              const memberRoles = member.role.split(",");

              const isOwner = memberRoles.includes("owner");

              const isCurrentUser = member.userId === session.user.id;

              const showActions = canManageMembers && !isOwner && !isCurrentUser;

              return (
                <div className="flex items-center gap-4 p-4" key={member.id}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{member.user.name}</p>

                      {isCurrentUser && <span className="text-xs text-muted-foreground">You</span>}
                    </div>

                    <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
                  </div>

                  <Badge className="capitalize" variant="secondary">
                    {member.role}
                  </Badge>

                  {showActions ? (
                    <MemberActions
                      memberId={member.id}
                      memberName={member.user.name}
                      organizationId={organization.id}
                      role={member.role}
                    />
                  ) : (
                    <div className="size-9" />
                  )}
                </div>
              );
            })}{" "}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
