import { roleDefinitions } from "@mqdms/auth/permissions";
import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { notFound } from "next/navigation";

import {
  getOrganizationById,
  listOrganizationInvitations,
  listOrganizationMembers,
  requireSuperadmin,
} from "@/features/admin/server";

type OrganizationDetailPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const t = await getTranslations();

  // Sayfa kendi yetki kontrolünü yapar (layout ile paralel render ediliyor).
  await requireSuperadmin();

  const { organizationId } = await params;

  const organization = await getOrganizationById(organizationId);

  if (!organization) {
    notFound();
  }

  const [members, invitations] = await Promise.all([
    listOrganizationMembers(organizationId),
    listOrganizationInvitations(organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>

        <p className="mt-1 text-muted-foreground">
          {organization.slug} · created{" "}
          {organization.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.organization.members")}</CardTitle>

          <CardDescription>
            {t("admin.organization.membersCount", { count: members.length })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {members.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("admin.organization.noMembers")}</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {members.map((member) => (
                <div className="flex items-center gap-4 p-4" key={member.id}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>

                    <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                  </div>

                  {!member.emailVerified && (
                    <Badge variant="outline">{t("admin.users.unverified")}</Badge>
                  )}

                  {member.banned && <Badge variant="destructive">{t("admin.users.banned")}</Badge>}

                  <Badge className="capitalize" variant="secondary">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.organization.invitations")}</CardTitle>

          <CardDescription>
            {t("admin.organization.invitationsCount", { count: invitations.length })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invitations.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("admin.organization.noInvitations")}</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {invitations.map((invitation) => (
                <div className="flex items-center gap-4 p-4" key={invitation.id}>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{invitation.email}</p>

                  {invitation.role && (
                    <Badge className="capitalize" variant="outline">
                      {invitation.role}
                    </Badge>
                  )}

                  <Badge variant="secondary">{invitation.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.organization.fixedRoles")}</CardTitle>

          <CardDescription>{t("admin.organization.fixedRolesDescription")}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="divide-y rounded-md border">
            {Object.entries(roleDefinitions).map(([roleId, definition]) => (
              <div className="flex items-center gap-4 p-4" key={roleId}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{definition.label}</p>

                  <p className="truncate text-sm text-muted-foreground">{definition.description}</p>
                </div>

                <Badge className="capitalize" variant="secondary">
                  {roleId}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
