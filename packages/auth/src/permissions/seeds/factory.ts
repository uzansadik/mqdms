import "server-only";

import { type DbClient, db } from "@mqdms/db";
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
  await db.transaction(async (tx) => {
    for (const template of factoryRoleTemplates) {
      const created = await tx
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
        await upgradeFactoryRole(organizationId, template, tx);
        continue;
      }

      const grants = getTemplateGrants(template);

      if (grants.length === 0) {
        continue;
      }

      await tx
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
  });
}

/**
 * Var olan bir seed rolünü güncel seed sürümüne taşır.
 *
 * Yalnızca rolün uygulanmış sürümünden **sonraki** sürümlerde tanımlanan
 * izinler eklenir. Owner'ın seed rolünden kaldırdığı bir izin geri gelmez.
 *
 * Yalnızca fabrika seed'i ile oluşturulmuş roller yükseltilir: `seedVersion`
 * boş olan roller owner'ın custom rolüdür ve hiç değiştirilmez.
 *
 * @returns rol yükseltildiyse `true`.
 */
export async function upgradeFactoryRole(
  organizationId: string,
  template: FactoryRoleTemplate,
  client: DbClient | typeof db = db,
): Promise<boolean> {
  const rows = await client
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

  /*
   * Fabrika seed'i ile oluşturulmamış roller (owner'ın custom rolü) seed
   * yükseltmesinde hiç değiştirilmez.
   */
  if (!role.seedVersion) {
    return false;
  }

  if (role.seedVersion === FACTORY_SEED_VERSION) {
    return false;
  }

  const grants = getPendingVersionGrants(template, role.seedVersion, FACTORY_SEED_VERSION);

  if (grants.length > 0) {
    await client
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

  await client
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
 * `client` verilirse yükseltme o transaction içinde çalışır: audit kaydı da
 * aynı transaction'da yazılırsa, audit yazımı başarısız olduğunda yükseltme
 * de geri alınır.
 *
 * @returns yükseltilen rol sayısı.
 */
export async function upgradeFactoryRoles(
  organizationId: string,
  client?: DbClient,
): Promise<number> {
  if (client) {
    return applyFactoryRoleUpgrades(organizationId, client);
  }

  return db.transaction((tx) => applyFactoryRoleUpgrades(organizationId, tx));
}

/** Seed rollerini yükseltir (transaction istemcisi üzerinde çalışır). */
async function applyFactoryRoleUpgrades(organizationId: string, client: DbClient): Promise<number> {
  let upgraded = 0;

  for (const template of factoryRoleTemplates) {
    if (await upgradeFactoryRole(organizationId, template, client)) {
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
