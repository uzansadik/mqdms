import { db } from "@mqdms/db";
import { item, itemGroup } from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { type BomExplosionNode, explodeBom } from "@/features/boms/explosion";

/**
 * Ürün ağacı analizi.
 *
 * Bir deliverable'ın ürün ağacı açıldığında kullanıcı şunları görür:
 *
 * - Toplam benzersiz item sayısı
 * - FRP, metal, kimyasal, elyaf ve standart eleman dağılımı
 * - Üretilen ve satın alınan parça dağılımı
 * - Sınıflandırılmamış item'lar
 * - Alt BOM'u bulunan ürünler
 * - Eksik veya çözümlenmemiş BOM referansları
 *
 * Aynı reçinenin elli farklı FRP altında kullanılması halinde benzersiz item
 * sayısında **bir kez** sayılır; kullanım sayısı ayrıca raporlanır.
 */

/** Ürün ağacındaki kategori. */
export type ProductStructureCategory =
  | "FRP"
  | "METAL"
  | "CHEMICAL"
  | "FIBER"
  | "STANDARD"
  | "ASSEMBLY"
  | "CONSUMABLE"
  | "UNCLASSIFIED"
  | "OTHER";

export type ProductStructureAnalysis = {
  /** Ağaçtaki benzersiz item sayısı. */
  uniqueItemCount: number;

  /** Kategoriye göre benzersiz item sayıları. */
  byCategory: Record<ProductStructureCategory, number>;

  /** Tedarik şekline göre benzersiz item sayıları. */
  bySupplyType: Record<string, number>;

  /** Sınıflandırılmamış (grubu olmayan) item sayısı. */
  unclassifiedItemCount: number;

  /** Kendi alt BOM'u bulunan item sayısı. */
  itemsWithOwnBomCount: number;

  /** Çözümlenmemiş BOM referansı sayısı. */
  unresolvedReferenceCount: number;

  /** Birden fazla kez kullanılan item'lar ve kullanım sayıları. */
  repeatedUsage: {
    itemId: string;
    itemCode: string | null;
    itemName: string | null;
    occurrenceCount: number;
  }[];

  /** Toplam malzeme miktarı; birim ve revision başına ayrı hesaplanır. */
  totalQuantity: {
    itemId: string;
    itemCode: string | null;
    quantity: number;
    unitOfMeasureCode: string | null;
    itemRevision: string | null;
  }[];
};

/** Kategori sınıflandırması için grup yolu örüntüleri. */
const CATEGORY_PATTERNS: {
  category: ProductStructureCategory;
  patterns: readonly string[];
}[] = [
  { category: "FRP", patterns: ["FRP"] },
  { category: "METAL", patterns: ["METAL", "SHEET_METAL", "WELDED_PART", "MACHINED_PART"] },
  { category: "CHEMICAL", patterns: ["CHEMICAL", "RESIN", "GELCOAT", "HARDENER", "ADHESIVE"] },
  { category: "FIBER", patterns: ["REINFORCEMENT", "GLASS_FIBER", "CARBON_FIBER", "FIBER"] },
  { category: "STANDARD", patterns: ["STANDARD_COMPONENT", "BOLT", "NUT", "HINGE", "LOCK"] },
  { category: "ASSEMBLY", patterns: ["ASSEMBLY"] },
  { category: "CONSUMABLE", patterns: ["CONSUMABLE"] },
];

/**
 * Bir item'ın kategorisini grup yolundan belirler.
 *
 * Grup yolu kökten alta doğru kurulur ve kodlardan eşleştirme yapılır. Grubun
 * hiç yoksa item sınıflandırılmamış sayılır.
 */
function classifyByGroupPath(groupPath: string[]): ProductStructureCategory {
  if (groupPath.length === 0) {
    return "UNCLASSIFIED";
  }

  const codes = groupPath.map((code) => code.toUpperCase());

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (codes.some((code) => patterns.includes(code))) {
      return category;
    }
  }

  return "OTHER";
}

/**
 * Ürün ağacını analiz eder.
 *
 * @param organizationId analizin kapsandığı organizasyon.
 * @param bomRevisionId analiz edilecek BOM revision'ı.
 */
export async function analyzeProductStructure(
  organizationId: string,
  bomRevisionId: string,
): Promise<ProductStructureAnalysis> {
  const tree = await explodeBom(organizationId, bomRevisionId);

  /*
   * Ağaçtaki item'lar toplanır. Her item için grup, tedarik şekli ve
   * kullanım sayısı hesaplanır.
   */
  const occurrences = new Map<string, number>();
  const itemIds = new Set<string>();
  const itemsWithChildren = new Set<string>();
  let unresolvedReferenceCount = 0;

  /*
   * Toplam miktar, ürün + revision + birim üçlüsüyle toplanır: aynı bileşen
   * farklı revision veya farklı birimle kullanılıyorsa doğrulanmadan tek
   * satırda birleştirilmez.
   */
  const quantityKey = (node: BomExplosionNode) =>
    `${node.childItemId}|${node.childItemRevision ?? ""}|${node.unitOfMeasureCode ?? ""}`;

  const quantities = new Map<
    string,
    {
      itemId: string;
      itemCode: string | null;
      itemName: string | null;
      quantity: number;
      unitOfMeasureCode: string | null;
      itemRevision: string | null;
    }
  >();

  const walk = (nodes: BomExplosionNode[], multiplier: number) => {
    for (const node of nodes) {
      itemIds.add(node.childItemId);
      occurrences.set(node.childItemId, (occurrences.get(node.childItemId) ?? 0) + 1);

      const key = quantityKey(node);
      const quantity = node.quantity * multiplier;

      const existingQuantity = quantities.get(key);

      if (existingQuantity) {
        existingQuantity.quantity += quantity;
      } else {
        quantities.set(key, {
          itemId: node.childItemId,
          itemCode: node.childItemCode,
          itemName: node.childItemName,
          quantity,
          unitOfMeasureCode: node.unitOfMeasureCode,
          itemRevision: node.childItemRevision,
        });
      }

      if (node.unresolved) {
        unresolvedReferenceCount += 1;
      }

      if (node.children.length > 0) {
        itemsWithChildren.add(node.childItemId);
        walk(node.children, quantity);
      }
    }
  };

  walk(tree, 1);

  const itemRows = await listItemsWithGroup(organizationId, [...itemIds]);
  const groupPaths = await buildGroupPaths(organizationId, itemRows);

  const byCategory = emptyCategoryCounts();
  const bySupplyType: Record<string, number> = {};
  let unclassifiedItemCount = 0;

  for (const row of itemRows) {
    const category = classifyByGroupPath(groupPaths.get(row.id) ?? []);

    byCategory[category] += 1;

    if (category === "UNCLASSIFIED") {
      unclassifiedItemCount += 1;
    }

    const supplyType = row.supplyType ?? "UNKNOWN";

    bySupplyType[supplyType] = (bySupplyType[supplyType] ?? 0) + 1;
  }

  const repeatedUsage = itemRows
    .filter((row) => (occurrences.get(row.id) ?? 0) > 1)
    .map((row) => ({
      itemId: row.id,
      itemCode: row.code,
      itemName: row.name,
      occurrenceCount: occurrences.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  return {
    uniqueItemCount: itemRows.length,
    byCategory,
    bySupplyType,
    unclassifiedItemCount,
    itemsWithOwnBomCount: itemsWithChildren.size,
    unresolvedReferenceCount,
    repeatedUsage,
    totalQuantity: [...quantities.values()].sort((a, b) => {
      if (a.itemCode && b.itemCode) {
        return a.itemCode.localeCompare(b.itemCode);
      }

      return 0;
    }),
  };
}

/** Analiz için item kayıtları (grup ve tedarik şekli ile). */
async function listItemsWithGroup(
  organizationId: string,
  itemIds: string[],
): Promise<
  {
    id: string;
    code: string;
    name: string;
    itemGroupId: string | null;
    supplyType: string | null;
  }[]
> {
  if (itemIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: item.id,
      code: item.code,
      name: item.name,
      itemGroupId: item.itemGroupId,
      supplyType: item.supplyType,
    })
    .from(item)
    .where(and(eq(item.organizationId, organizationId), inArray(item.id, itemIds)));
}

/**
 * Item'ların grup yollarını kökten alta doğru kurar.
 *
 * Grup hiyerarşisi organizasyona özeldir; yol yukarıdan aşağı yürütülerek
 * çözülür.
 */
async function buildGroupPaths(
  organizationId: string,
  rows: { id: string; itemGroupId: string | null }[],
): Promise<Map<string, string[]>> {
  const paths = new Map<string, string[]>();

  const groupIds = [...new Set(rows.map((row) => row.itemGroupId).filter(Boolean))] as string[];

  if (groupIds.length === 0) {
    return paths;
  }

  const groups = await db
    .select({
      id: itemGroup.id,
      code: itemGroup.code,
      parentId: itemGroup.parentId,
    })
    .from(itemGroup)
    .where(and(eq(itemGroup.organizationId, organizationId), inArray(itemGroup.id, groupIds)));

  const byId = new Map(groups.map((group) => [group.id, group]));

  const resolvePath = (groupId: string, seen: Set<string>): string[] => {
    if (seen.has(groupId)) {
      return [];
    }

    seen.add(groupId);

    const group = byId.get(groupId);

    if (!group) {
      return [];
    }

    const parentPath = group.parentId ? resolvePath(group.parentId, seen) : [];

    return [...parentPath, group.code];
  };

  for (const row of rows) {
    if (!row.itemGroupId) {
      paths.set(row.id, []);
      continue;
    }

    paths.set(row.id, resolvePath(row.itemGroupId, new Set<string>()));
  }

  return paths;
}

/** Kategori sayaçlarının boş hâli. */
function emptyCategoryCounts(): Record<ProductStructureCategory, number> {
  return {
    FRP: 0,
    METAL: 0,
    CHEMICAL: 0,
    FIBER: 0,
    STANDARD: 0,
    ASSEMBLY: 0,
    CONSUMABLE: 0,
    UNCLASSIFIED: 0,
    OTHER: 0,
  };
}
