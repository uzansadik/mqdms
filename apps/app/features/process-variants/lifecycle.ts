/**
 * Process Variant Revision yaşam döngüsü.
 *
 * Geçişler tek bir yerde tanımlıdır: servis ve arayüz aynı kuralları
 * paylaşır. Bir revision'ın durumu yalnızca izinli bir geçişle değişebilir.
 */

/** Revision durumu. */
export type RevisionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";

/**
 * İzinli geçişler.
 *
 * ```text
 * DRAFT → IN_REVIEW → APPROVED → RELEASED → SUPERSEDED
 * IN_REVIEW → DRAFT
 * APPROVED → DRAFT (gerekçeli geri alma)
 * ```
 */
export const ALLOWED_TRANSITIONS: Record<RevisionStatus, RevisionStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["RELEASED", "DRAFT"],
  RELEASED: [],
  SUPERSEDED: [],
};

/** Geçiş izinli mi? */
export function canTransition(from: RevisionStatus, to: RevisionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Revision teknik içeriği düzenlenebilir mi?
 *
 * Yayınlanmış (`RELEASED`) ve geçersiz kılınmış (`SUPERSEDED`) revision'lar
 * teknik içerik olarak değiştirilemez.
 */
export function isEditable(status: RevisionStatus): boolean {
  return status === "DRAFT";
}
