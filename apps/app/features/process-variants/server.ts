import { requirePermission } from "@/features/auth/session";

import {
  getProcessVariant,
  getProcessVariantRevision,
  listProcessVariantRevisions,
} from "./repository";

/**
 * Process Variant sayfalarının koruma ve veri katmanı.
 */

/** Proses varyantı modülüne erişim zorunluluğu. */
export async function requireProcessVariantsAccess(action = "read"): Promise<void> {
  await requirePermission("processVariants", action);
}

/**
 * Varyant detayının verisi.
 *
 * Kayıt bulunamazsa `null` döner; sayfa `notFound()` ile 404 üretir.
 */
export async function getProcessVariantDetailData(organizationId: string, variantId: string) {
  const variant = await getProcessVariant(organizationId, variantId);

  if (!variant) {
    return null;
  }

  const revisions = await listProcessVariantRevisions(organizationId, variantId);

  return { variant, revisions };
}

/**
 * Revision detayının verisi.
 *
 * Revision her zaman varyanta bağlıdır; bağlı olmayan revision bulunamaz.
 */
export async function getProcessVariantRevisionDetailData(
  organizationId: string,
  revisionId: string,
) {
  const revision = await getProcessVariantRevision(organizationId, revisionId);

  if (!revision) {
    return null;
  }

  const variant = await getProcessVariant(organizationId, revision.processVariantId);

  if (!variant) {
    return null;
  }

  return { revision, variant };
}
