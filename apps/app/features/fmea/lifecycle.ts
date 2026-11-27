/**
 * FMEA Belgesi yaşam döngüsü.
 *
 * Geçişler tek bir yerde tanımlıdır: servis ve arayüz aynı kuralları
 * paylaşır. Bir belgenin durumu yalnızca izinli bir geçişle değişebilir.
 */

/** FMEA belgesi durumu. */
export type FmeaDocumentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED";

/**
 * İzinli geçişler.
 *
 * ```text
 * DRAFT → IN_REVIEW → APPROVED → RELEASED
 * IN_REVIEW → DRAFT (gerekçeli geri alma / ret)
 * APPROVED → DRAFT (gerekçeli geri alma)
 * ```
 */
export const ALLOWED_TRANSITIONS: Record<FmeaDocumentStatus, FmeaDocumentStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["RELEASED", "DRAFT"],
  RELEASED: [],
};

/** Geçiş izinli mi? */
export function canTransition(from: FmeaDocumentStatus, to: FmeaDocumentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Belge içeriği düzenlenebilir mi?
 *
 * Yayınlanmış (`RELEASED`) belge teknik içerik olarak değiştirilemez.
 *
 * Bu kontrol **belgenin kendi durumu** içindir; ayrıca bağlı olduğu
 * Process Variant Revision'ın da taslak olması gerekir (servis katmanı
 * ikisini birlikte doğrular).
 */
export function isEditable(status: FmeaDocumentStatus): boolean {
  return status === "DRAFT";
}
