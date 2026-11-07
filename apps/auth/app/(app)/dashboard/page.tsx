import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Building2, CalendarDays, ShieldCheck, Users } from "lucide-react";

import { requireSession } from "@/features/auth/session";
import { getOrganizationDetails, requireOrganization } from "@/features/organization/server";

export default async function DashboardPage() {
  const t = await getTranslations();

  const session = await requireSession();
  const organization = await requireOrganization();

  const details = await getOrganizationDetails(organization.id);

  const currentMember = details?.members.find((member) => member.userId === session.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {" "}
          {t("dashboard.welcome", {
            name: session.user.name ?? session.user.email,
          })}
        </h1>

        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of {organization.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.members")}</CardTitle>

            <Users className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">{details?.members.length ?? 0}</div>

            <p className="text-xs text-muted-foreground">Workspace members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your role</CardTitle>

            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold capitalize">
              {currentMember?.role ?? "Member"}
            </div>

            <p className="text-xs text-muted-foreground">Organization access level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspace</CardTitle>

            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="truncate text-2xl font-semibold">{organization.slug}</div>

            <p className="text-xs text-muted-foreground">Workspace identifier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>

            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-semibold">
              {organization.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            <p className="text-xs text-muted-foreground">Workspace creation date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Getting started</CardTitle>

            <CardDescription>Set up your workspace before you start building.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <GettingStartedItem
              description="Configure your workspace details and preferences."
              label="Workspace configured"
            />

            <GettingStartedItem
              description="Add people who will work with you."
              label="Invite team members"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>

            <CardDescription>Current organization</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>

              <p className="font-medium">{organization.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Slug</p>

              <p className="font-medium">{organization.slug}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Your role</p>

              <Badge className="mt-1 capitalize" variant="secondary">
                {currentMember?.role ?? "member"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type GettingStartedItemProps = {
  label: string;
  description: string;
  pending?: boolean;
};

function GettingStartedItem({ label, description, pending = false }: GettingStartedItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium">{label}</p>

        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Badge variant={pending ? "outline" : "secondary"}>{pending ? "Coming soon" : "Ready"}</Badge>
    </div>
  );
}
