import { requirePermission } from "@/features/auth/session";
import { listItemGroupOptions } from "@/features/item-groups/repository";
import { listItemOptions } from "@/features/items/repository";
import {
  listProcessApplicabilities,
  listProcessIoDefinitions,
} from "@/features/process-io/repository";
import {
  listFunctionRequirements,
  listProcessFunctions,
  listProcessRequirements,
} from "@/features/process-requirements/repository";
import { listWorkElements } from "@/features/process-work-elements/repository";

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

/**
 * Revision'ın teknik içeriği.
 *
 * Flow, work element, fonksiyon, gereklilik, girdi/çıktı ve applicability
 * kayıtları revision'a bağlıdır; hepsi aynı revision kapsamında okunur.
 */
export async function getProcessVariantRevisionContentData(
  organizationId: string,
  revisionId: string,
) {
  const [workElements, functions, requirements, ioDefinitions, applicabilities, items, itemGroups] =
    await Promise.all([
      listWorkElements(organizationId, revisionId),
      listProcessFunctions(organizationId, revisionId),
      listProcessRequirements(organizationId, revisionId),
      listProcessIoDefinitions(organizationId, revisionId),
      listProcessApplicabilities(organizationId, revisionId),
      listItemOptions(organizationId),
      listItemGroupOptions(organizationId),
    ]);

  const links: Record<string, string[]> = {};

  for (const func of functions) {
    const requirementLinks = await listFunctionRequirements(organizationId, func.id);

    links[func.id] = requirementLinks.map((entry) => entry.id);
  }

  return {
    workElements,
    functions,
    requirements,
    ioDefinitions,
    applicabilities,
    items,
    itemGroups,
    links,
  };
}
