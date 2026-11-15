import { type BomLineSummary, type BomRevisionChange, diffBomLines } from "./comparison";
import { listBomLines } from "./repository";
import { type BomTreeLine, buildBomTree } from "./tree";

/**
 * İki BOM revision'ını karşılaştırır.
 *
 * Satır verileri veritabanından okunur, eşleştirme `lineageId` üzerinden
 * yapılır. Üst satır ilişkisi de lineage üzerinden karşılaştırılır: satır
 * kimlikleri revision'lar arasında değişir, lineage kimlikleri değişmez.
 */
export async function compareBomRevisions(
  organizationId: string,
  fromRevisionId: string,
  toRevisionId: string,
): Promise<BomRevisionChange[]> {
  const [fromLines, toLines] = await Promise.all([
    listBomLines(organizationId, fromRevisionId),
    listBomLines(organizationId, toRevisionId),
  ]);

  return diffBomLines(toSummaries(fromLines), toSummaries(toLines));
}

/** Kayıt satırlarını karşılaştırma özetine çevirir. */
function toSummaries(lines: Awaited<ReturnType<typeof listBomLines>>): BomLineSummary[] {
  const treeLines: BomTreeLine[] = lines.map((line) => ({
    id: line.id,
    parentLineId: line.parentLineId,
    lineageId: line.lineageId,
    lineNumber: line.lineNumber,
    sortOrder: line.sortOrder,
    quantity: line.quantity,
    unitOfMeasureId: line.unitOfMeasureId,
    childItemId: line.childItemId,
    childItemRevisionId: line.childItemRevisionId,
    childItemRevision: line.childItemRevision,
    referenceDesignation: line.referenceDesignation,
    joiningMethod: line.joiningMethod,
    description: line.description,
    notes: line.notes,
    positionReference: line.positionReference,
    childItemCode: line.childItemCode,
    childItemName: line.childItemName,
    childItemType: line.childItemType,
    childItemStructureType: line.childItemStructureType,
    childItemSupplyType: line.childItemSupplyType,
    childItemIsSellable: line.childItemIsSellable,
    childItemUnitOfMeasureId: line.childItemUnitOfMeasureId ?? "",
    childItemStatus: line.childItemStatus,
    childItemArchivedAt: line.childItemArchivedAt,
    unitOfMeasureCode: line.unitOfMeasureCode,
  }));

  const tree = buildBomTree(treeLines);

  const lineageById = new Map(lines.map((line) => [line.id, line.lineageId]));

  return lines.map((line) => {
    const node = tree.byId.get(line.id);

    return {
      id: line.id,
      lineageId: line.lineageId,
      parentLineageId: line.parentLineId ? (lineageById.get(line.parentLineId) ?? null) : null,
      childItemId: line.childItemId,
      childItemCode: line.childItemCode,
      childItemName: line.childItemName,
      childItemRevisionId: line.childItemRevisionId,
      childItemRevision: line.childItemRevision,
      quantity: line.quantity,
      unitOfMeasureId: line.unitOfMeasureId,
      unitOfMeasureCode: line.unitOfMeasureCode,
      referenceDesignation: line.referenceDesignation,
      sortOrder: line.sortOrder,
      path: node?.path ?? "",
    };
  });
}
