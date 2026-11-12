import {
  getOrganizationMemberRoleMap,
  listOrganizationMembers,
  listOrganizationRoles,
} from "@mqdms/auth/permissions/server";
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
import { InviteMemberForm } from "@/features/organization/invite-member-form";
import { MemberActions } from "@/features/organization/member-actions";

export default async function MembersPage() {
  const t = await getTranslations();

  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  const [members, roles, roleMap] = await Promise.all([
    listOrganizationMembers(context.organizationId),
    listOrganizationRoles(context.organizationId),
    getOrganizationMemberRoleMap(context.organizationId),
  ]);

  const selectableRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("organization.members.invite.title")}</CardTitle>

          <CardDescription>
            {t("organization.members.invite.description", { name: context.organization.name })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <InviteMemberForm organizationId={context.organizationId} roles={selectableRoles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("organization.members.title")}</CardTitle>

          <CardDescription>
            {t(
              members.length === 1
                ? "organization.members.countOne"
                : "organization.members.countOther",
              { count: members.length },
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="divide-y rounded-md border">
            {members.map((member) => {
              const isOwner = member.role.split(",").includes("owner");

              const isCurrentUser = member.userId === context.userId;

              const showActions = !isOwner && !isCurrentUser;

              return (
                <div className="flex items-center gap-4 p-4" key={member.id}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{member.name}</p>

                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">
                          {t("organization.members.you")}
                        </span>
                      )}
                    </div>

                    <p className="truncate text-sm text-muted-foreground">{member.email}</p>

                    {!isOwner && (roleMap.get(member.id)?.length ?? 0) > 0 && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {roles
                          .filter((role) => roleMap.get(member.id)?.includes(role.id))
                          .map((role) => role.name)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <Badge className="capitalize" variant="secondary">
                    {member.role}
                  </Badge>

                  {showActions ? (
                    <MemberActions
                      memberId={member.id}
                      memberName={member.name}
                      roleIds={roleMap.get(member.id) ?? []}
                      roles={selectableRoles}
                    />
                  ) : (
                    <div className="size-9" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
