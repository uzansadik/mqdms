import { type DbClient, db } from "@mqdms/db";
import {
  flow,
  flowNode,
  item,
  itemGroup,
  process,
  processVariant,
  processVariantRevision,
  processVariantRevisionFlow,
} from "@mqdms/db/schema";
import { and, asc, eq } from "drizzle-orm";

import type { FmeaSourceImportValues } from "./schema";

/**
 * Yapı analizi kaynaklarından içe aktarım.
 *
 * AIAG–VDA adım 2 ("yapı analizi") için gereken ağaç, organizasyonun
 * mevcut kayıtlarından türetilir:
 *
 * - `FLOW` (PFMEA): revision'ın akışındaki faaliyetler.
 * - `ITEM` (DFMEA): ürün grubu → ürün hiyerarşisi.
 * - `PROCESS` (SFMEA): ana proses → varyant → revision.
 *
 * İçe aktarım **yalnızca yapı elemanlarını** üretir; hata modu, neden,
 * kontrol ve aksiyon satırlarına dokunulmaz.
 */

/** İçe aktarımda üretilen satır. */
export type ImportedStructureRow = {
  parentIndex: number | null;
  level: "SYSTEM" | "SUBSYSTEM" | "COMPONENT";
  code: string;
  name: string;
  description: string | null;
  flowNodeId: string | null;
  itemId: string | null;
  processWorkElementId: string | null;
  sortOrder: number;
};

/**
 * Kaynaktan yapı elemanı satırları üretir.
 *
 * Dönen dizide `parentIndex`, aynı dizideki üst satırın indeksidir; kayıt
 * sırası ebeveyn-çocuk sırasını garanti eder.
 */
export async function buildImportedStructureRows(
  organizationId: string,
  revisionId: string,
  input: FmeaSourceImportValues,
  client: DbClient | typeof db = db,
): Promise<ImportedStructureRow[]> {
  if (input.source === "FLOW") {
    return buildFlowRows(organizationId, revisionId, client);
  }

  if (input.source === "ITEM") {
    return buildItemRows(organizationId, client);
  }

  return buildProcessRows(organizationId, revisionId, client);
}

/** PFMEA: revision'ın akışındaki faaliyetler. */
async function buildFlowRows(
  organizationId: string,
  revisionId: string,
  client: DbClient | typeof db,
): Promise<ImportedStructureRow[]> {
  const nodes = await client
    .select({
      id: flowNode.id,
      title: flowNode.title,
      description: flowNode.description,
      sortOrder: flowNode.sortOrder,
    })
    .from(processVariantRevisionFlow)
    .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
    .innerJoin(flowNode, eq(flowNode.flowId, flow.id))
    .where(
      and(
        eq(processVariantRevisionFlow.organizationId, organizationId),
        eq(processVariantRevisionFlow.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(flowNode.sortOrder), asc(flowNode.title));

  return nodes.map((node, index) => ({
    parentIndex: null,
    level: "COMPONENT" as const,
    code: node.title,
    name: node.title,
    description: node.description,
    flowNodeId: node.id,
    itemId: null,
    processWorkElementId: null,
    sortOrder: index,
  }));
}

/**
 * DFMEA: ürün grubu → ürün hiyerarşisi.
 *
 * Ürün grubu alt sistem, ürün bileşen seviyesindedir.
 */
async function buildItemRows(
  organizationId: string,
  client: DbClient | typeof db,
): Promise<ImportedStructureRow[]> {
  const groups = await client
    .select({ id: itemGroup.id, name: itemGroup.name })
    .from(itemGroup)
    .where(eq(itemGroup.organizationId, organizationId))
    .orderBy(asc(itemGroup.name));

  const items = await client
    .select({
      id: item.id,
      name: item.name,
      code: item.code,
      itemGroupId: item.itemGroupId,
    })
    .from(item)
    .where(eq(item.organizationId, organizationId))
    .orderBy(asc(item.code));

  const rows: ImportedStructureRow[] = [];
  const groupIndex = new Map<string, number>();

  for (const group of groups) {
    groupIndex.set(group.id, rows.length);

    rows.push({
      parentIndex: null,
      level: "SUBSYSTEM",
      code: group.name,
      name: group.name,
      description: null,
      flowNodeId: null,
      itemId: null,
      processWorkElementId: null,
      sortOrder: rows.length,
    });
  }

  for (const entry of items) {
    const parentIndex = entry.itemGroupId ? (groupIndex.get(entry.itemGroupId) ?? null) : null;

    rows.push({
      parentIndex,
      level: "COMPONENT",
      code: entry.code,
      name: entry.name,
      description: null,
      flowNodeId: null,
      itemId: entry.id,
      processWorkElementId: null,
      sortOrder: rows.length,
    });
  }

  return rows;
}

/** SFMEA: ana proses → varyant → revision. */
async function buildProcessRows(
  organizationId: string,
  revisionId: string,
  client: DbClient | typeof db,
): Promise<ImportedStructureRow[]> {
  const revision = await client
    .select({
      id: processVariantRevision.id,
      revision: processVariantRevision.revision,
      variantId: processVariantRevision.processVariantId,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.id, revisionId),
      ),
    )
    .limit(1);

  if (!revision[0]) {
    return [];
  }

  const variant = await client
    .select({
      id: processVariant.id,
      code: processVariant.code,
      name: processVariant.name,
      processId: processVariant.processId,
    })
    .from(processVariant)
    .where(
      and(
        eq(processVariant.organizationId, organizationId),
        eq(processVariant.id, revision[0].variantId),
      ),
    )
    .limit(1);

  if (!variant[0]) {
    return [];
  }

  const master = await client
    .select({ id: process.id, code: process.code, name: process.name })
    .from(process)
    .where(and(eq(process.organizationId, organizationId), eq(process.id, variant[0].processId)))
    .limit(1);

  if (!master[0]) {
    return [];
  }

  return [
    {
      parentIndex: null,
      level: "SYSTEM",
      code: master[0].code,
      name: master[0].name,
      description: null,
      flowNodeId: null,
      itemId: null,
      processWorkElementId: null,
      sortOrder: 0,
    },
    {
      parentIndex: 0,
      level: "SUBSYSTEM",
      code: variant[0].code,
      name: variant[0].name,
      description: null,
      flowNodeId: null,
      itemId: null,
      processWorkElementId: null,
      sortOrder: 1,
    },
    {
      parentIndex: 1,
      level: "COMPONENT",
      code: revision[0].revision,
      name: `Revision ${revision[0].revision}`,
      description: null,
      flowNodeId: null,
      itemId: null,
      processWorkElementId: null,
      sortOrder: 2,
    },
  ];
}
