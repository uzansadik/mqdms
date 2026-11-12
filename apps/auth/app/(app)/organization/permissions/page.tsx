import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { requireRequestContext } from "@/features/auth/context";
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix";
import { getMemberPermissionMatrix } from "@/features/permissions/server";

export default async function PermissionsPage() {
  const t = await getTranslations();

  const context = await requireRequestContext();

  if (!context.isOwner) {
    redirect("/dashboard");
  }

  const matrix = await getMemberPermissionMatrix(context);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.title")}</CardTitle>

          <CardDescription>{t("permissions.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <PermissionMatrix
            members={matrix.map((member) => ({
              memberId: member.memberId,
              name: member.name,
              email: member.email,
              role: member.role,
              grants: member.grants,
              roleGrants: member.roleGrants,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
