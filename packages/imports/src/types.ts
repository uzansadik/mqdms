import type { ConflictResolution, ImportRowError, ImportRowStatus } from "./schema";

/**
 * İçe aktarımın istemci ve sunucu arasında paylaşılan tipleri.
 *
 * Bu dosya yalnızca **tip** tanımları içerir; çalışma zamanı bağımlılığı
 * yoktur. Böylece web uygulamasının istemci bileşenleri bu tipleri
 * veritabanına bağlanmadan kullanabilir.
 */

/** Doğrulanan tek satırın sonucu. */
export type ImportRowResult = {
  /** Dosyadaki satır numarası. */
  rowNumber: number;

  status: ImportRowStatus;

  /** Hedef varlığın türü (`item`, `customerItem`, `bomLine`, …). */
  targetType: string;

  /** Mevcut kaydın id'si; yeni kayıt oluşturulacaksa null. */
  targetId: string | null;

  /** Kullanıcıya gösterilen kısa etiket. */
  label: string;

  errors: ImportRowError[];

  /** Yazılacak değerler; doğrulama sırasında çözülmüş id'lerle. */
  values: Record<string, unknown>;
};

/** Doğrulama önizlemesi. */
export type ImportPreview = {
  /** Doğrulanan satırlar. */
  rows: ImportRowResult[];

  /** Oluşturulacak kayıt sayısı. */
  createCount: number;

  /** Güncellenecek kayıt sayısı. */
  updateCount: number;

  /** Hatalı satır sayısı. */
  errorCount: number;

  /** Toplam satır sayısı. */
  totalRows: number;

  /**
   * Mevcut bir kaydın üzerine yazılacak satırlar.
   *
   * Bu satırlar için kullanıcı karar vermek zorundadır: mevcut kayıt
   * korunur ya da dosyadaki değerlerle güncellenir.
   */
  conflicts: ImportRowResult[];

  /** Doğrulama hatası olan satırlar. */
  invalidRows: ImportRowResult[];

  /** İş üzerinde kayıtlı çakışma çözümü. */
  resolution: ConflictResolution;
};
