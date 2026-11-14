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

import { compareRevisions, layoutChanges, technicalChanges } from "./comparison";
import {
  getProcessVariant,
  getProcessVariantRevision,
  listProcessVariantRevisions,
} from "./repository";
import { getRevisionSnapshot } from "./source-update";

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
 * İki revision'ın karşılaştırma verisi.
 *
 * Her iki revision da aynı varyanta ait olmalıdır; aksi halde karşılaştırma
 * yapılmaz. Teknik değişiklikler ve görsel düzen değişiklikleri ayrı döner.
 */
export async function getRevisionComparisonData(
  organizationId: string,
  variantId: string,
  fromRevisionId: string,
  toRevisionId: string,
) {
  const [from, to] = await Promise.all([
    getProcessVariantRevision(organizationId, fromRevisionId),
    getProcessVariantRevision(organizationId, toRevisionId),
  ]);

  if (!from || !to) {
    return null;
  }

  if (from.processVariantId !== variantId || to.processVariantId !== variantId) {
    return null;
  }

  const [before, after] = await Promise.all([
    getRevisionSnapshot(organizationId, from.id),
    getRevisionSnapshot(organizationId, to.id),
  ]);

  const changes = compareRevisions(before, after);

  return {
    from,
    to,
    technical: technicalChanges(changes),
    layout: layoutChanges(changes),
  };
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
