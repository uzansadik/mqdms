import type { RevisionChange, RevisionContentCategory } from "./comparison";

/**
 * Kaynak güncellemesi seçim kuralları.
 *
 * Bu modül saf fonksiyonlardan oluşur: seçim kuralları veritabanından bağımsız
 * test edilir.
 */

/** Kullanıcının seçtiği değişiklik. */
export type SourceUpdateSelection = {
  category: RevisionContentCategory;
  logicalId: string;
};

/** Seçim anahtarı; kategori ve mantıksal kimlikten oluşur. */
export function selectionKey(selection: SourceUpdateSelection): string {
  return `${selection.category}:${selection.logicalId}`;
}

/**
 * Seçimleri kategori bazında toplar.
 *
 * Aynı kategori içinde mantıksal kimlik benzersizdir; tekrarlar birleştirilir.
 */
export function groupSelections(
  selections: SourceUpdateSelection[],
): Map<RevisionContentCategory, Set<string>> {
  const grouped = new Map<RevisionContentCategory, Set<string>>();

  for (const selection of selections) {
    const existing = grouped.get(selection.category);

    if (existing) {
      existing.add(selection.logicalId);
    } else {
      grouped.set(selection.category, new Set([selection.logicalId]));
    }
  }

  return grouped;
}

/**
 * Aktarılabilir değişiklikler.
 *
 * Kaynakta **silinmiş** kayıtlar aktarılamaz: silme işlemi, başka kayıtlar
 * tarafından kullanılıyor olabileceği için otomatik yapılmaz. Kullanıcı
 * silinmiş kaydı kendi revision'ında tutmaya devam edebilir.
 */
export function transferableChanges(changes: RevisionChange[]): RevisionChange[] {
  return changes.filter((change) => change.type !== "REMOVED");
}

/**
 * Varsayılan seçim.
 *
 * Aktarılabilir tüm teknik değişiklikler seçilir; görsel düzen değişiklikleri
 * teknik değişiklik sayılmadığı için seçilmez.
 */
export function defaultSelections(changes: RevisionChange[]): string[] {
  return transferableChanges(changes)
    .filter((change) => !change.layoutOnly)
    .map((change) => selectionKey({ category: change.category, logicalId: change.logicalId }));
}
