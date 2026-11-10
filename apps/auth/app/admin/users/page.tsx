import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";

import { UserRowActions } from "@/features/admin/components/user-row-actions";
import { listAllUsers, requireSuperadmin } from "@/features/admin/server";

export default async function AdminUsersPage() {
  const t = await getTranslations();

  // Sayfa kendi yetki kontrolünü yapar (layout ile paralel render ediliyor).
  await requireSuperadmin();

  const users = await listAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.users.title")}</h1>

        <p className="mt-1 text-muted-foreground">{t("admin.users.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.all")}</CardTitle>

          <CardDescription>{t("admin.users.count", { count: users.length })}</CardDescription>
        </CardHeader>

        <CardContent>
          {users.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("admin.users.empty")}</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {users.map((user) => (
                <div className="flex items-center gap-4 p-4" key={user.id}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name}</p>

                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  {!user.emailVerified && (
                    <Badge variant="outline">{t("admin.users.unverified")}</Badge>
                  )}

                  {user.banned && <Badge variant="destructive">{t("admin.users.banned")}</Badge>}

                  <Badge className="capitalize" variant="secondary">
                    {user.role ?? "user"}
                  </Badge>

                  <UserRowActions banned={user.banned} role={user.role} userId={user.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
