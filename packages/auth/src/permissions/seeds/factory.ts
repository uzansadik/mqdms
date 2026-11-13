import "server-only";

import { db } from "@mqdms/db";
import { organizationRole, organizationRolePermission } from "@mqdms/db/schema";
import { and, eq, sql } from "drizzle-orm";

import {
  FACTORY_SEED_VERSION,
  type FactoryRoleTemplate,
  factoryRoleTemplates,
  getPendingVersionGrants,
  getTemplateGrants,
} from "./catalog";

export {
  FACTORY_SEED_VERSION,
  type FactoryRoleTemplate,
  factoryRoleTemplates,
  getPendingVersionGrants,
  getTemplateGrants,
  getVersionGrants,
  type RolePermissions,
} from "./catalog";

/**
 * Organizasyon için fabrika rollerini seed eder.
 *
 * İşlem idempotenttir: var olan roller ve izinler korunur, yeniden seed
 * düzenlemeleri ezmez. Rol ve izin kayıtları organizasyona özeldir; iki
 * organizasyon birbirinin rollerini göremez.
 *
 * Rol zaten varsa **yalnızca** yeni seed sürümlerinde tanımlanan izinler
 * eklenir (bkz. `upgradeFactoryRole`).
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
        seedVersion: FACTORY_SEED_VERSION,
      })
      .onConflictDoNothing({
        target: [organizationRole.organizationId, organizationRole.slug],
      })
      .returning({ id: organizationRole.id });

    const roleId = created[0]?.id;

    if (!roleId) {
      // Rol zaten var: sürüm farkı kapatılır, düzenlemeler korunur.
      await upgradeFactoryRole(organizationId, template);
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
 * Var olan bir seed rolünü güncel seed sürümüne taşır.
 *
 * Yalnızca rolün uygulanmış sürümünden **sonraki** sürümlerde tanımlanan
 * izinler eklenir. Owner'ın seed rolünden kaldırdığı bir izin geri gelmez;
 * custom roller (seed şablonu olmayan slug'lar) hiç değiştirilmez.
 *
 * @returns rol yükseltildiyse `true`.
 */
export async function upgradeFactoryRole(
  organizationId: string,
  template: FactoryRoleTemplate,
): Promise<boolean> {
  const rows = await db
    .select({
      id: organizationRole.id,
      seedVersion: organizationRole.seedVersion,
    })
    .from(organizationRole)
    .where(
      and(
        eq(organizationRole.organizationId, organizationId),
        eq(organizationRole.slug, template.slug),
      ),
    );

  const role = rows[0];

  if (!role) {
    return false;
  }

  if (role.seedVersion === FACTORY_SEED_VERSION) {
    return false;
  }

  const grants = getPendingVersionGrants(template, role.seedVersion, FACTORY_SEED_VERSION);

  if (grants.length > 0) {
    await db
      .insert(organizationRolePermission)
      .values(
        grants.map((grant) => ({
          organizationId,
          roleId: role.id,
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

  await db
    .update(organizationRole)
    .set({ seedVersion: FACTORY_SEED_VERSION })
    .where(eq(organizationRole.id, role.id));

  return true;
}

/**
 * Organizasyonun seed rollerini güncel sürüme taşır.
 *
 * Mevcut organizasyonların yeni kaynaklara (`customers`, `plants`) ve yeni
 * proje aksiyonlarına erişmesi için gereklidir. İşlem idempotenttir ve
 * tekrar çalıştırılabilir.
 *
 * @returns yükseltilen rol sayısı.
 */
export async function upgradeFactoryRoles(organizationId: string): Promise<number> {
  let upgraded = 0;

  for (const template of factoryRoleTemplates) {
    if (await upgradeFactoryRole(organizationId, template)) {
      upgraded += 1;
    }
  }

  return upgraded;
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
