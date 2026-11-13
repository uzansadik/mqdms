import { getBomRevision, listBomLines, listBomsByItem } from "./repository";

/**
 * BOM çözümleme (explosion) servisi.
 *
 * İki görünüm desteklenir:
 *
 * 1. **Hiyerarşik**: üst-alt ürün ağacı.
 * 2. **Düzleştirilmiş**: bütün alt bileşenlerin toplulaştırılmış listesi.
 *
 * Eksik veri **tahmin edilmez**: alt BOM'u olan ama revision'ı belirlenmemiş bir
 * bileşen çözümlenmemiş olarak işaretlenir ve alt bileşenleri sayılmaz.
 */

/** Çözümlemede bir düğüm. */
export type BomExplosionNode = {
  bomLineId: string | null;
  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  childItemRevision: string | null;
  childBomRevisionId: string | null;
  lineNumber: number | null;
  quantity: number;
  unitOfMeasureId: string | null;
  unitOfMeasureCode: string | null;
  referenceDesignation: string | null;
  joiningMethod: "BONDING" | "BOLTING" | "WELDING" | "RIVETING" | "OTHER" | null;

  /** Ağaçtaki derinlik; kök satırlar 1. seviyedir. */
  level: number;

  /**
   * Alt bileşenleri çözülemedi mi?
   *
   * `true` ise bu dalın alt bileşenleri bilinmiyor: döngüsel ilişki ya da
   * belirlenmemiş alt BOM revision'ı.
   */
  unresolved: boolean;

  /** Çözümlenememe sebebi. */
  unresolvedReason: string | null;

  children: BomExplosionNode[];
};

/** Düzleştirilmiş bir bileşen satırı. */
export type BomFlattenedLine = {
  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  childItemRevision: string | null;
  unitOfMeasureId: string | null;
  unitOfMeasureCode: string | null;
  /** Toplam miktar; üst seviyelerin miktarları çarpılarak hesaplanır. */
  quantity: number;

  /** Bu bileşenin kaç yerde geçtiği (kullanım sayısı). */
  occurrenceCount: number;

  /** En az bir kullanım çözümlenmemiş mi? */
  unresolved: boolean;
};

/** Düzleştirme seçenekleri. */
export type BomFlattenOptions = {
  /**
   * Ara mamuller de toplama dahil mi?
   *
   * `false` (varsayılan) yalnızca en derin çözümlenmiş bileşenleri toplar:
   * bir ara mamul ile onun altındaki hammaddeler aynı toplamda **çift
   * sayılmaz**. `true` olduğunda her seviye ayrı ayrı toplanır.
   */
  includeIntermediate?: boolean;

  /** Azami derinlik; ağaç sınırsız büyüyemez. */
  maxDepth?: number;
};

const DEFAULT_MAX_DEPTH = 20;

/**
 * Bir BOM revision'ını çözümler.
 *
 * @param organizationId çözümlemenin kapsandığı organizasyon.
 * @param bomRevisionId çözümlenecek revision.
 */
export async function explodeBom(
  organizationId: string,
  bomRevisionId: string,
  options: BomFlattenOptions = {},
): Promise<BomExplosionNode[]> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  return explodeRevision(organizationId, bomRevisionId, 1, new Set<string>(), maxDepth);
}

/** Bir revision'ın satırlarını çözümler. */
async function explodeRevision(
  organizationId: string,
  bomRevisionId: string,
  level: number,
  visited: Set<string>,
  maxDepth: number,
): Promise<BomExplosionNode[]> {
  if (level > maxDepth) {
    return [];
  }

  const lines = await listBomLines(organizationId, bomRevisionId);

  const nodes: BomExplosionNode[] = [];

  for (const line of lines) {
    const node: BomExplosionNode = {
      bomLineId: line.id,
      childItemId: line.childItemId,
      childItemCode: line.childItemCode,
      childItemName: line.childItemName,
      childItemRevision: line.childItemRevision,
      childBomRevisionId: line.childBomRevisionId,
      lineNumber: line.lineNumber,
      quantity: line.quantity,
      unitOfMeasureId: line.unitOfMeasureId,
      unitOfMeasureCode: line.unitOfMeasureCode,
      referenceDesignation: line.referenceDesignation,
      joiningMethod: line.joiningMethod,
      level,
      unresolved: false,
      unresolvedReason: null,
      children: [],
    };

    if (line.childBomRevisionId) {
      if (visited.has(line.childBomRevisionId)) {
        /*
         * Döngüsel ilişki: aynı alt BOM revision'ına ikinci kez gelindi.
         * Ağaç sonsuza kadar açılmasın diye dal çözümlenmemiş olarak
         * işaretlenir.
         */
        node.unresolved = true;
        node.unresolvedReason = "Döngüsel BOM ilişkisi.";
      } else if (level >= maxDepth) {
        node.unresolved = true;
        node.unresolvedReason = "Azami çözümleme derinliği aşıldı.";
      } else {
        const nextVisited = new Set(visited);
        nextVisited.add(bomRevisionId);

        node.children = await explodeRevision(
          organizationId,
          line.childBomRevisionId,
          level + 1,
          nextVisited,
          maxDepth,
        );
      }
    } else {
      /*
       * Alt BOM revision'ı belirlenmemiş. Bileşenin kendi BOM'u varsa alt
       * bileşenleri bilinmiyor demektir; yoksa sıradan bir yapıtaşıdır.
       */
      const childBoms = await listBomsByItem(organizationId, line.childItemId);

      if (childBoms.length > 0) {
        node.unresolved = true;
        node.unresolvedReason = "Alt BOM revision'ı belirlenmemiş.";
      }
    }

    nodes.push(node);
  }

  return nodes;
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
  const includeIntermediate = options.includeIntermediate ?? false;

  const tree = await explodeBom(organizationId, bomRevisionId, options);

  const totals = new Map<
    string,
    {
      line: BomFlattenedLine;
    }
  >();

  const walk = (nodes: BomExplosionNode[], multiplier: number) => {
    for (const node of nodes) {
      const quantity = node.quantity * multiplier;

      const isLeaf = node.children.length === 0;

      if (isLeaf || includeIntermediate) {
        /*
         * Grup anahtarı: ürün + revision + birim. Aynı ürün farklı revision
         * veya farklı birimle kullanılıyorsa ayrı satırda kalır.
         */
        const key = `${node.childItemId}|${node.childItemRevision ?? ""}|${node.unitOfMeasureId ?? ""}`;

        const existing = totals.get(key);

        if (existing) {
          existing.line.quantity += quantity;
          existing.line.occurrenceCount += 1;
          existing.line.unresolved = existing.line.unresolved || node.unresolved;
        } else {
          totals.set(key, {
            line: {
              childItemId: node.childItemId,
              childItemCode: node.childItemCode,
              childItemName: node.childItemName,
              childItemRevision: node.childItemRevision,
              unitOfMeasureId: node.unitOfMeasureId,
              unitOfMeasureCode: node.unitOfMeasureCode,
              quantity,
              occurrenceCount: 1,
              unresolved: node.unresolved,
            },
          });
        }
      }

      if (node.children.length > 0) {
        walk(node.children, quantity);
      }
    }
  };

  walk(tree, 1);

  return [...totals.values()]
    .map((entry) => entry.line)
    .sort((a, b) => {
      if (a.childItemCode && b.childItemCode) {
        return a.childItemCode.localeCompare(b.childItemCode);
      }

      return 0;
    });
}

/**
 * Bir revision'ın yayınlanmış olup olmadığını doğrular.
 *
 * Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez.
 */
export async function isBomRevisionReleased(
  organizationId: string,
  bomRevisionId: string,
): Promise<boolean> {
  const revision = await getBomRevision(organizationId, bomRevisionId);

  return revision?.status === "RELEASED";
}
