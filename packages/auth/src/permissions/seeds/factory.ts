import "server-only";

import { db } from "@mqdms/db";
import { organizationRole, organizationRolePermission } from "@mqdms/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { factoryRoleTemplates, getTemplateGrants } from "./catalog";

export {
  FACTORY_SEED_VERSION,
  type FactoryRoleTemplate,
  factoryRoleTemplates,
  getTemplateGrants,
  type RolePermissions,
} from "./catalog";

/**
 * Organizasyon için fabrika rollerini seed eder.
 *
 * İşlem idempotenttir: var olan roller ve izinler korunur, yeniden seed
 * düzenlemeleri ezmez. Rol ve izin kayıtları organizasyona özeldir; iki
 * organizasyon birbirinin rollerini göremez.
 */
export async function seedFactoryRoles(
  organizationId: string,
  createdById?: string,
): Promise<void> {
  for (const template of factoryRoleTemplates) {
    const created = await db
      .insert(organizationRole)
      .values({
        organizationId,
        slug: template.slug,
        name: template.name,
        description: template.description,
        createdById: createdById ?? null,
      })
      .onConflictDoNothing({
        target: [organizationRole.organizationId, organizationRole.slug],
      })
      .returning({ id: organizationRole.id });

    const roleId = created[0]?.id;

    if (!roleId) {
      continue;
    }

    const grants = getTemplateGrants(template);

    if (grants.length === 0) {
      continue;
    }

    await db
      .insert(organizationRolePermission)
      .values(
        grants.map((grant) => ({
          organizationId,
          roleId,
          resource: grant.resource,
          action: grant.action,
        })),
      )
      .onConflictDoNothing({
        target: [
          organizationRolePermission.roleId,
          organizationRolePermission.resource,
          organizationRolePermission.action,
        ],
      });
  }
}

/**
 * Organizasyonun seed edilmiş rol sayısı.
 *
 * Testler ve bootstrap doğrulaması için kullanılır.
 */
export async function countFactoryRoles(organizationId: string): Promise<number> {
  const rows = await db
    .select({ id: organizationRole.id })
    .from(organizationRole)
    .where(
      and(
        eq(organizationRole.organizationId, organizationId),
        sql`${organizationRole.slug} in ${sql.join(
          factoryRoleTemplates.map((template) => sql`${template.slug}`),
          sql`, `,
        )}`,
      ),
    );

  return rows.length;
}
