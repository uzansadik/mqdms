/**
 * Ürün sınıflandırmasına dayanan BOM iş kuralları.
 *
 * Bu modül **saf**tır: veritabanına veya oturuma bağlı değildir. Böylece
 * kurallar veritabanından bağımsız olarak test edilebilir ve aynı kurallar
 * hem sunucuda hem arayüzde kullanılabilir.
 */

/** Ürün tipi. */
export type ItemType =
  | "FINISHED_GOOD"
  | "SEMI_FINISHED"
  | "RAW_MATERIAL"
  | "COMPONENT"
  | "CONSUMABLE"
  | "OTHER";

/** Ürünün yapısal niteliği. */
export type ItemStructureType = "ASSEMBLY" | "GROUP" | "PART";

/** Ürünün tedarik şekli. */
export type SupplyType = "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN";

/** Sınıflandırma için gereken ürün alanları. */
export type ItemClassification = {
  id: string;
  code: string;
  name: string;
  itemType: ItemType;
  structureType: ItemStructureType;
  supplyType: SupplyType | null;
  isSellable: boolean;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
  unitOfMeasureId: string;
};

/** Kural sonucu. */
export type EligibilityResult = {
  /** Kural sağlanıyor mu? */
  ok: boolean;

  /** Sağlanmıyorsa kullanıcıya gösterilecek sebepler. */
  reasons: string[];
};

/** Alt satır taşıyabilen ürün tipleri. */
const PARENT_ITEM_TYPES: ItemType[] = ["FINISHED_GOOD", "SEMI_FINISHED", "COMPONENT"];

/** Doğrudan kök altında yer alamayan ürün tipleri. */
const ROOT_LEVEL_FORBIDDEN_TYPES: ItemType[] = ["RAW_MATERIAL", "CONSUMABLE"];

/** Ürün aktif ve arşivlenmemiş mi? */
function isUsable(item: ItemClassification): boolean {
  return item.status === "ACTIVE" && item.archivedAt === null;
}

/**
 * BOM kökü olabilecek ürünü denetler.
 *
 * Kök ürün satılabilir bir mamul olmalıdır; üretilen ya da satın alınan
 * olabilir. Satın alınan bir mamule de BOM açılabilir.
 */
export function checkRootEligibility(item: ItemClassification): EligibilityResult {
  const reasons: string[] = [];

  if (!isUsable(item)) {
    reasons.push("Ürün pasif veya arşivlenmiş.");
  }

  if (item.itemType !== "FINISHED_GOOD") {
    reasons.push("BOM açılabilmesi için ürün tipi mamul (FINISHED_GOOD) olmalıdır.");
  }

  if (!item.isSellable) {
    reasons.push("BOM açılabilmesi için ürün satılabilir olmalıdır.");
  }

  if (item.supplyType !== "MANUFACTURED" && item.supplyType !== "PURCHASED") {
    reasons.push(
      "BOM açılabilmesi için ürünün tedarik şekli üretilen veya satın alınan olmalıdır.",
    );
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Alt satır taşıyabilecek (parent) ürünü denetler.
 *
 * Bir satırın altında başka satır bulunabilmesi için ürünün montaj ya da
 * grup niteliğinde olması ve uygun bir ürün tipinde bulunması gerekir.
 */
export function checkParentEligibility(item: ItemClassification): EligibilityResult {
  const reasons: string[] = [];

  if (!isUsable(item)) {
    reasons.push("Ürün pasif veya arşivlenmiş.");
  }

  if (item.structureType === "PART") {
    reasons.push("Parça niteliğindeki ürünlerin altında alt satır bulunamaz.");
  }

  if (!PARENT_ITEM_TYPES.includes(item.itemType)) {
    reasons.push("Ham madde, sarf veya diğer ürünler alt satır taşıyamaz.");
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Bir satır olarak eklenebilecek ürünü denetler.
 *
 * @param depth Satırın derinliği; 1 = doğrudan kök altı.
 */
export function checkChildEligibility(item: ItemClassification, depth: number): EligibilityResult {
  const reasons: string[] = [];

  if (!isUsable(item)) {
    reasons.push("Ürün pasif veya arşivlenmiş.");
  }

  if (depth === 1 && ROOT_LEVEL_FORBIDDEN_TYPES.includes(item.itemType)) {
    reasons.push("Ham madde ve sarf malzeme doğrudan ana ürünün altında yer alamaz.");
  }

  return { ok: reasons.length === 0, reasons };
}

/** Ürünün alt satır taşıyıp taşıyamayacağı. */
export function canHaveChildren(item: ItemClassification): boolean {
  return checkParentEligibility(item).ok;
}
