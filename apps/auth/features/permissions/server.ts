import { evaluatePermission, hasCapability, type PermissionGrant } from "@mqdms/auth/permissions";
import { db } from "@mqdms/db";
import { memberPermission } from "@mqdms/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  getActiveOrganizationMember,
  getOrganizationMember,
  requireOrganization,
} from "@/features/organization/server";

function toGrant(row: {
  resource: string;
  action: string;
  effect: string;
  memberId?: string;
}): PermissionGrant {
  return {
    resource: row.resource,
    action: row.action,
    effect: row.effect === "deny" ? "deny" : "allow",
    memberId: row.memberId,
  };
}

/** Bir üyeye verilmiş yetki kayıtları. */
export async function getMemberGrants(memberId: string): Promise<PermissionGrant[]> {
  const rows = await db
    .select({
      resource: memberPermission.resource,
      action: memberPermission.action,
      effect: memberPermission.effect,
      memberId: memberPermission.memberId,
    })
    .from(memberPermission)
    .where(eq(memberPermission.memberId, memberId));

  return rows.map(toGrant);
}

/** Organizasyondaki tüm yetki kayıtları. */
export async function getOrganizationGrants(organizationId: string): Promise<PermissionGrant[]> {
  const rows = await db
    .select({
      resource: memberPermission.resource,
      action: memberPermission.action,
      effect: memberPermission.effect,
      memberId: memberPermission.memberId,
    })
    .from(memberPermission)
    .where(eq(memberPermission.organizationId, organizationId));

  return rows.map(toGrant);
}

/**
 * Oturumdaki kullanıcının aktif organizasyondaki üye kaydı.
 *
 * Aktif organizasyon henüz oturuma yazılmamışsa organizasyon üzerinden
 * bulunur; böylece sayfa ile yerleşim bileşenleri farklı sırada çizilse de
 * yetki kontrolü doğru sonucu verir.
 */
async function getCurrentMember(): Promise<{ id: string; role: string } | null> {
  const activeMember = await getActiveOrganizationMember();

  if (activeMember) {
    return { id: activeMember.id, role: activeMember.role };
  }

  const organization = await requireOrganization();

  const member = await getOrganizationMember(organization.id);

  return member ? { id: member.id, role: member.role } : null;
}

/** Aktif üyenin belirli bir kaynak/aksiyon yetkisi var mı? */
export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const member = await getCurrentMember();

  if (!member) {
    return false;
  }

  const grants = await getMemberGrants(member.id);

  return evaluatePermission({
    role: member.role,
    grants,
    resource,
    action,
  });
}

/** Aktif üye yetki yönetebilir mi? (owner / admin) */
export async function canManagePermissions(): Promise<boolean> {
  const member = await getCurrentMember();

  if (!member) {
    return false;
  }

  return hasCapability({ role: member.role, capability: "managePermissions" });
}

/** Sayfa koruması: yetki yoksa dashboard'a yönlendirir. */
export async function requirePermission(resource: string, action: string): Promise<void> {
  if (!(await hasPermission(resource, action))) {
    redirect("/dashboard");
  }
}

/** Sayfa koruması: yetki yönetemiyorsa dashboard'a yönlendirir. */
export async function requirePermissionManager(): Promise<void> {
  if (!(await canManagePermissions())) {
    redirect("/dashboard");
  }
}
