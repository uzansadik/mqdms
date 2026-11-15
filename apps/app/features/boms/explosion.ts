import { listBomLines } from "./repository";
import {
  type BomFlattenedLine,
  type BomFlattenOptions,
  type BomTreeLine,
  type BomTreeNode,
  buildBomTree,
  flattenBomTree,
} from "./tree";

/**
 * BOM çözümleme (explosion) servisi.
 *
 * Ağaç **tek revision'ın satırlarından** kurulur: alt BOM sorgusu veya özyinelemeli
 * (recursive) çözümleme yapılmaz. Bir alt montaj için ayrı BOM oluşturulmaz;
 * gruplar aynı revision içinde `parentLineId` ile bağlanır.
 */

/** Revision satırlarını ağaç düğümlerine çevirir. */
export async function explodeBom(
  organizationId: string,
  bomRevisionId: string,
): Promise<BomTreeNode[]> {
  const lines = await listBomLines(organizationId, bomRevisionId);

  return buildBomTree(toTreeLines(lines)).roots;
}

/**
 * BOM'u düzleştirilmiş listeye çevirir.
 *
 * Aynı bileşen farklı revision veya farklı birimle kullanılıyorsa doğrulanmadan
 * tek satırda birleştirilmez: gruplama anahtarı ürün, revision ve birimdir.
 */
export async function flattenBom(
  organizationId: string,
  bomRevisionId: string,
  options: BomFlattenOptions = {},
): Promise<BomFlattenedLine[]> {
  const lines = await listBomLines(organizationId, bomRevisionId);

  return flattenBomTree(buildBomTree(toTreeLines(lines)), options);
}

/** Bir revision'ın bütün bileşenleri (tekilleştirilmiş). */
export async function listBomComponentOptions(
  organizationId: string,
  bomRevisionId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  const lines = await flattenBom(organizationId, bomRevisionId, { includeIntermediate: true });

  const items = new Map<string, { id: string; code: string; name: string }>();

  for (const line of lines) {
    if (items.has(line.childItemId)) {
      continue;
    }

    items.set(line.childItemId, {
      id: line.childItemId,
      code: line.childItemCode ?? "",
      name: line.childItemName ?? "",
    });
  }

  return [...items.values()];
}

/** Kayıt satırlarını ağaç satırlarına çevirir. */
function toTreeLines(lines: Awaited<ReturnType<typeof listBomLines>>): BomTreeLine[] {
  return lines.map((line) => ({
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
}
