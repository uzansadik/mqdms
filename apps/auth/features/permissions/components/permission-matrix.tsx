"use client";

import { resources } from "@mqdms/auth/permissions";
import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { setMemberPermissionAction } from "../actions";

type MemberGrant = {
  resource: string;
  action: string;
  effect: "allow" | "deny";
};

type RoleGrant = {
  resource: string;
  action: string;
};

type MatrixMember = {
  memberId: string;
  name: string;
  email: string;
  role: string;
  grants: MemberGrant[];
  roleGrants: RoleGrant[];
};

type PermissionMatrixProps = {
  members: MatrixMember[];
};

type CellState = "inherit" | "allow" | "deny";

export function PermissionMatrix({ members }: PermissionMatrixProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(memberId: string, resource: string, action: string, state: CellState) {
    setPendingMemberId(memberId);
    setError(null);

    const result = await setMemberPermissionAction({
      memberId,
      resource,
      action,
      effect: state,
    });

    setPendingMemberId(null);

    if (!result.success) {
      setError(result.error);

      return;
    }

    router.refresh();
  }

  if (members.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-sm font-medium">{t("permissions.empty.title")}</p>

        <p className="mt-1 text-sm text-muted-foreground">{t("permissions.empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {members.map((member) => (
        <div className="rounded-md border" key={member.memberId}>
          <div className="flex items-center gap-3 border-b p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
              {member.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.name}</p>

              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            </div>

            <Badge className="capitalize" variant="secondary">
              {member.role}
            </Badge>
          </div>

          <div className="divide-y">
            {Object.entries(resources).map(([resourceKey, resource]) => (
              <div className="p-4" key={resourceKey}>
                <p className="text-sm font-medium">{resource.label}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {resource.actions.map((action) => {
                    const grant = member.grants.find(
                      (item) => item.resource === resourceKey && item.action === action,
                    );

                    const state: CellState = grant?.effect ?? "inherit";

                    /*
                     * `inherit` durumunda yetki üyeye atanmış rollerden gelir.
                     * Rol vermiyorsa izin yoktur.
                     */
                    const inherited = member.roleGrants.some(
                      (item) => item.resource === resourceKey && item.action === action,
                    );

                    return (
                      <div className="flex items-center justify-between gap-2" key={action}>
                        <span className="text-sm text-muted-foreground">{action}</span>

                        <Select
                          disabled={pendingMemberId === member.memberId}
                          onValueChange={(value) =>
                            update(member.memberId, resourceKey, action, value as CellState)
                          }
                          value={state}
                        >
                          <SelectTrigger className="w-32" size="sm">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="inherit">
                              {inherited
                                ? t("permissions.state.inheritAllowed")
                                : t("permissions.state.inheritDenied")}
                            </SelectItem>

                            <SelectItem value="allow">{t("permissions.state.allowed")}</SelectItem>

                            <SelectItem value="deny">{t("permissions.state.denied")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
