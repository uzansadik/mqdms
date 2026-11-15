import { checkChildEligibility, type ItemClassification } from "./eligibility";

/**
 * BOM ağacı kurma, doğrulama ve düzleştirme işlemleri.
 *
 * Bu modül **saf**tır: veritabanına bağlı değildir. Ağaç tek bir revision'ın
 * satırlarından kurulur; alt BOM sorgusu veya özyinelemeli (recursive) çözümleme
 * yapılmaz.
 */

/** Revision etiketi (`REV.01`, `REV.02`, … `REV.100`). */
export function formatRevisionLabel(revisionNumber: number): string {
  return `REV.${String(revisionNumber).padStart(2, "0")}`;
}

/** Ağaç kurulumunda kullanılan satır verisi. */
export type BomTreeLine = {
  id: string;
  parentLineId: string | null;
  lineageId: string;
  lineNumber: number;
  sortOrder: number;
  quantity: number;
  unitOfMeasureId: string | null;
  childItemId: string;
  childItemRevisionId: string | null;
  childItemRevision: string | null;
  referenceDesignation: string | null;
  joiningMethod: "BONDING" | "BOLTING" | "WELDING" | "RIVETING" | "OTHER" | null;
  description: string | null;
  notes: string | null;
  positionReference: string | null;

  /** Ürün bilgileri; okuma sırasında birleştirilir. */
  childItemCode: string | null;
  childItemName: string | null;
  childItemType: ItemClassification["itemType"];
  childItemStructureType: ItemClassification["structureType"];
  childItemSupplyType: ItemClassification["supplyType"];
  childItemIsSellable: boolean;
  childItemUnitOfMeasureId: string;
  childItemStatus: "ACTIVE" | "INACTIVE";
  childItemArchivedAt: Date | null;
  unitOfMeasureCode: string | null;
};

/** Ağaçtaki bir düğüm. */
export type BomTreeNode = {
  line: BomTreeLine;

  /** Derinlik; 1 = doğrudan kök altı. */
  depth: number;

  /** Hiyerarşik yol (`1.2.3`); kök altındaki satırlar `1`, `2`, … */
  path: string;

  children: BomTreeNode[];
};

/** Ağaç kurulumunda bulunan yapısal sorun. */
export type BomTreeIssue = {
  type: "ORPHAN" | "CYCLE" | "SELF_PARENT";

  /** Sorunlu satırın id'si. */
  lineId: string;

  /** Kullanıcıya gösterilecek açıklama. */
  message: string;
};

/** Kurulan ağaç. */
export type BomTree = {
  /** Kök altındaki satırlar (üst satırı olmayanlar). */
  roots: BomTreeNode[];

  /** Tüm düğümler; id ile erişim için. */
  byId: Map<string, BomTreeNode>;

  /** Yapısal sorunlar. */
  issues: BomTreeIssue[];
};

/**
 * Düz satır listesinden ağaç kurar.
 *
 * Döngü ve yetim satır tespiti **iteratif** yapılır: derin ağaçlarda
 * çağrı yığını taşmaz.
 */
export function buildBomTree(lines: BomTreeLine[]): BomTree {
  const byId = new Map<string, BomTreeNode>();
  const issues: BomTreeIssue[] = [];

  for (const line of lines) {
    byId.set(line.id, {
      line,
      depth: 0,
      path: "",
      children: [],
    });
  }

  const roots: BomTreeNode[] = [];

  for (const line of lines) {
    const node = byId.get(line.id);

    if (!node) {
      continue;
    }

    if (line.parentLineId === null) {
      roots.push(node);
      continue;
    }

    if (line.parentLineId === line.id) {
      issues.push({
        type: "SELF_PARENT",
        lineId: line.id,
        message: "Satır kendisini üst satır olarak gösteriyor.",
      });
      roots.push(node);
      continue;
    }

    const parent = byId.get(line.parentLineId);

    if (!parent) {
      issues.push({
        type: "ORPHAN",
        lineId: line.id,
        message: "Satırın üst satırı bulunamadı.",
      });
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  // Kardeşler sıra numarasına göre sıralanır.
  for (const node of byId.values()) {
    node.children.sort((a, b) => {
      if (a.line.sortOrder !== b.line.sortOrder) {
        return a.line.sortOrder - b.line.sortOrder;
      }

      return a.line.lineNumber - b.line.lineNumber;
    });
  }

  roots.sort((a, b) => {
    if (a.line.sortOrder !== b.line.sortOrder) {
      return a.line.sortOrder - b.line.sortOrder;
    }

    return a.line.lineNumber - b.line.lineNumber;
  });

  /*
   * Derinlik, yol ve döngü tespiti. Köklerden başlayan iteratif gezinti
   * kullanılır: derin ağaçlarda çağrı yığını taşmaz. Döngüye giren
   * satırlar köklerden erişilemez; gezinti sonunda kalan satırlar döngü
   * olarak raporlanır.
   */
  const visited = new Set<string>();
  const stack: {
    node: BomTreeNode;
    ancestors: string[];
    index: number;
    parentPath: string | null;
  }[] = roots.map((node, index) => ({ node, ancestors: [], index, parentPath: null })).reverse();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const { node, ancestors, index, parentPath } = current;

    visited.add(node.line.id);

    node.depth = ancestors.length + 1;
    node.path = parentPath === null ? String(index + 1) : `${parentPath}.${index + 1}`;

    node.children.forEach((child, childIndex) => {
      if (ancestors.includes(child.line.id) || child.line.id === node.line.id) {
        issues.push({
          type: "CYCLE",
          lineId: child.line.id,
          message: "Satırlar arasında döngüsel bir üst satır ilişkisi var.",
        });
        return;
      }

      stack.push({
        node: child,
        ancestors: [...ancestors, node.line.id],
        index: childIndex,
        parentPath: node.path,
      });
    });
  }

  /*
   * Köklerden erişilemeyen satırlar ya döngüye ya da kopuk bir zincire
   * aittir. Kopuk satırlar yukarıda `ORPHAN` olarak raporlandı; kalanlar
   * döngüseldir.
   */
  for (const line of lines) {
    if (visited.has(line.id)) {
      continue;
    }

    if (line.parentLineId === null) {
      continue;
    }

    const parent = byId.get(line.parentLineId);

    if (!parent) {
      continue;
    }

    issues.push({
      type: "CYCLE",
      lineId: line.id,
      message: "Satırlar arasında döngüsel bir üst satır ilişkisi var.",
    });
  }

  return { roots, byId, issues };
}

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

  /** En az bir kullanım çözümlenemedi mi? */
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
};

/** Miktar ölçeği; veritabanı `numeric(18, 6)` kullanır. */
const QUANTITY_SCALE = 1_000_000n;

/** Miktarı tam sayıya (mikro birim) çevirir. */
function toMicros(value: number): bigint {
  return BigInt(Math.round(value * Number(QUANTITY_SCALE)));
}

/** Tam sayı miktarı tekrar ondalığa çevirir; altı hane hassasiyet korunur. */
function fromMicros(value: bigint): number {
  const whole = value / QUANTITY_SCALE;
  const fraction = value % QUANTITY_SCALE;

  return Number(`${whole}.${fraction.toString().padStart(6, "0")}`);
}

/**
 * İki miktarı kayan nokta hatası olmadan çarpar.
 *
 * Miktar altı ondalık basamağa ölçeklenir; çarpım sonrası ölçek bir kez
 * geri alınır ve yuvarlama yapılır.
 */
export function multiplyQuantities(left: number, right: number): number {
  const product = toMicros(left) * toMicros(right);

  return fromMicros((product + QUANTITY_SCALE / 2n) / QUANTITY_SCALE);
}

/** Miktar toplar; kayan nokta hatası olmaz. */
export function addQuantities(left: number, right: number): number {
  return fromMicros(toMicros(left) + toMicros(right));
}

/**
 * Ağacı düzleştirilmiş listeye çevirir.
 *
 * Aynı bileşen farklı revision veya farklı birimle kullanılıyorsa doğrulanmadan
 * tek satırda birleştirilmez: gruplama anahtarı ürün, revision ve birimdir.
 */
export function flattenBomTree(tree: BomTree, options: BomFlattenOptions = {}): BomFlattenedLine[] {
  const includeIntermediate = options.includeIntermediate ?? false;

  const totals = new Map<string, BomFlattenedLine>();

  const walk = (nodes: BomTreeNode[], multiplier: number) => {
    for (const node of nodes) {
      const quantity = multiplyQuantities(node.line.quantity, multiplier);

      const isLeaf = node.children.length === 0;

      if (isLeaf || includeIntermediate) {
        const key = [
          node.line.childItemId,
          node.line.childItemRevisionId ?? "",
          node.line.unitOfMeasureId ?? "",
        ].join("|");

        const existing = totals.get(key);

        if (existing) {
          existing.quantity = addQuantities(existing.quantity, quantity);
          existing.occurrenceCount += 1;
          continue;
        }

        totals.set(key, {
          childItemId: node.line.childItemId,
          childItemCode: node.line.childItemCode,
          childItemName: node.line.childItemName,
          childItemRevision: node.line.childItemRevision,
          unitOfMeasureId: node.line.unitOfMeasureId,
          unitOfMeasureCode: node.line.unitOfMeasureCode,
          quantity,
          occurrenceCount: 1,
          unresolved: false,
        });
      }

      if (node.children.length > 0) {
        walk(node.children, quantity);
      }
    }
  };

  walk(tree.roots, 1);

  return [...totals.values()].sort((a, b) => {
    if (a.childItemCode && b.childItemCode) {
      return a.childItemCode.localeCompare(b.childItemCode);
    }

    return 0;
  });
}

/** Ağaçtaki bir satırın üst satır zinciri (yukarı doğru). */
export function getAncestorIds(tree: BomTree, lineId: string): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>([lineId]);

  let current = tree.byId.get(lineId);

  while (current) {
    const parentId = current.line.parentLineId;

    if (!parentId || visited.has(parentId)) {
      break;
    }

    ancestors.push(parentId);
    visited.add(parentId);

    current = tree.byId.get(parentId);
  }

  return ancestors;
}

/** Doğrulama sonucu. */
export type BomTreeValidation = {
  ok: boolean;

  /** Hata mesajları; kullanıcıya gösterilir. */
  errors: string[];
};

/**
 * Ağacın iş kurallarını denetler.
 *
 * @param tree Kurulan ağaç.
 * @param rootItem BOM'un sahibi ürün.
 */
export function validateBomTree(tree: BomTree, rootItem: ItemClassification): BomTreeValidation {
  const errors: string[] = [];

  for (const issue of tree.issues) {
    errors.push(issue.message);
  }

  /*
   * Kardeş satırların sırası tekrarlanamaz: veritabanındaki kısmi unique
   * index'in karşılığı burada anlaşılır bir mesajla bildirilir.
   */
  const siblingOrders = new Map<string, Set<number>>();

  for (const node of tree.byId.values()) {
    const key = node.line.parentLineId ?? "root";

    const orders = siblingOrders.get(key) ?? new Set<number>();

    if (orders.has(node.line.sortOrder)) {
      errors.push("Aynı seviyedeki satırların sıra numaraları farklı olmalıdır.");
    }

    orders.add(node.line.sortOrder);
    siblingOrders.set(key, orders);
  }

  for (const node of tree.byId.values()) {
    const childItem: ItemClassification = {
      id: node.line.childItemId,
      code: node.line.childItemCode ?? "",
      name: node.line.childItemName ?? "",
      itemType: node.line.childItemType,
      structureType: node.line.childItemStructureType,
      supplyType: node.line.childItemSupplyType,
      isSellable: node.line.childItemIsSellable,
      status: node.line.childItemStatus,
      archivedAt: node.line.childItemArchivedAt,
      unitOfMeasureId: node.line.childItemUnitOfMeasureId,
    };

    if (node.line.childItemId === rootItem.id) {
      errors.push(`"${rootItem.code}" ürünü kendi BOM'unda bileşen olarak kullanılamaz.`);
      continue;
    }

    const childResult = checkChildEligibility(childItem, node.depth);

    for (const reason of childResult.reasons) {
      errors.push(`${node.line.childItemCode ?? node.line.childItemId}: ${reason}`);
    }

    /*
     * Bir satırın altında satır bulunması, ürünün sınıflandırmasına bağlı
     * değildir: montaj ve gruplar kartı henüz sınıflandırılmamış olabilir.
     * Yapısal kurallar (döngü, kendini içermeme, kökün tekrarı) ağacın
     * bütünlüğünü korur; sınıflandırma bilgilendirme amaçlıdır.
     */

    /*
     * Bir item kendi ata zincirinde tekrar edemez: iki seviye içinde aynı
     * ürün bulunması sonsuz açılan bir ağaç demektir.
     */
    const ancestors = getAncestorIds(tree, node.line.id);
    const ancestorItems = new Set(ancestors);

    for (const ancestorId of ancestorItems) {
      const ancestor = tree.byId.get(ancestorId);

      if (ancestor && ancestor.line.childItemId === node.line.childItemId) {
        errors.push(
          `${node.line.childItemCode ?? node.line.childItemId}: ürün kendi üst satır zincirinde tekrar ediyor.`,
        );
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Serbest satır numarası üretir.
 *
 * Revision içindeki global sıra, satır eklendiğinde artar; hiçbir iş kuralına
 * bağlı değildir.
 */
export function nextLineNumber(existingLineNumbers: number[]): number {
  return existingLineNumbers.reduce((max, value) => Math.max(max, value), 0) + 1;
}
