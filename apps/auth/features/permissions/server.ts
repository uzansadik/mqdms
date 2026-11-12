import {
  type AuthContext,
  getMemberPermissionDetails,
  hasPermission as hasContextPermission,
  listOrganizationMembers,
} from "@mqdms/auth/permissions/server";

import { redirect } from "next/navigation";

import { requireRequestContext } from "@/features/auth/context";

/**
 * Yetki yardımcıları.
 *
 * Yetki kararı `@mqdms/auth/permissions/server` tarafından verilir; bu
 * modül yalnızca uygulama düzeyindeki yönlendirme davranışını ekler.
 *
 * UI gizleme yalnızca UX'tir: gerçek kontrol her server action ve repository
 * sorgusunda ayrıca yapılır.
 */

/** Aktif üyenin belirli bir kaynak/aksiyon yetkisi var mı? */
export async function hasPermission(
  resource: string,
  action: string,
  context?: AuthContext,
): Promise<boolean> {
  const authContext = context ?? (await requireRequestContext());

  return hasContextPermission(authContext, resource, action);
}

/** Aktif üye yetki yönetebilir mi? (owner) */
export async function canManagePermissions(context?: AuthContext): Promise<boolean> {
  const authContext = context ?? (await requireRequestContext());

  return authContext.isOwner;
}

/** Sayfa koruması: yetki yoksa dashboard'a yönlendirir. */
export async function requirePermission(
  resource: string,
  action: string,
  context?: AuthContext,
): Promise<void> {
  if (!(await hasPermission(resource, action, context))) {
    redirect("/dashboard");
  }
}

/** Sayfa koruması: yetki yönetemiyorsa dashboard'a yönlendirir. */
export async function requirePermissionManager(context?: AuthContext): Promise<void> {
  if (!(await canManagePermissions(context))) {
    redirect("/dashboard");
  }
}

/** Organizasyondaki üyeler ve her birinin rol/grant detayları. */
export async function getMemberPermissionMatrix(context: AuthContext) {
  const members = await listOrganizationMembers(context.organizationId);

  const details = await Promise.all(
    members.map(async (member) => {
      const memberDetails = await getMemberPermissionDetails(context, member.id);

      return {
        memberId: member.id,
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        roleIds: memberDetails.roleIds,
        grants: memberDetails.grants,
        roleGrants: memberDetails.roleGrants,
      };
    }),
  );

  return details;
}
