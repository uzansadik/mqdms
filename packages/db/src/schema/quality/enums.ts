import { pgEnum } from "drizzle-orm/pg-core";

/**
 * FMEA alanının enum'ları.
 *
 * Değerler AIAG & VDA FMEA Handbook (2019) ve VDA'nın risk
 * sınıflandırmasına göre seçilmiştir. Ölçek metinleri (S/O/D kriterleri)
 * burada değil, uygulama katmanının saf modülünde tutulur.
 */

/**
 * FMEA tipi.
 *
 * `PFMEA` proses analizidir ve proses kütüphanesinden beslenir; `DFMEA`
 * ürün analizidir ve ürün yapısından; `SFMEA` ise sistem analizidir.
 */
export const fmeaType = pgEnum("fmea_type", ["PFMEA", "DFMEA", "SFMEA"]);

/**
 * FMEA belgesi yaşam döngüsü.
 *
 * Yayınlanmış (`RELEASED`) belge teknik içerik olarak değiştirilemez.
 */
export const fmeaDocumentStatus = pgEnum("fmea_document_status", [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "RELEASED",
]);

/**
 * Kullanılan değerlendirme yöntemi.
 *
 * `ACTION_PRIORITY`: AIAG & VDA Action Priority (H/M/L).
 * `RAG`: VDA risk sınıflandırması (A/B/C).
 * `BOTH`: her iki yöntem birlikte.
 */
export const fmeaEvaluationMethod = pgEnum("fmea_evaluation_method", [
  "ACTION_PRIORITY",
  "RAG",
  "BOTH",
]);

/** Sistem yapısındaki hiyerarşi seviyesi. */
export const fmeaStructureLevel = pgEnum("fmea_structure_level", [
  "SYSTEM",
  "SUBSYSTEM",
  "COMPONENT",
]);

/**
 * Fonksiyon aspekti.
 *
 * VDA fonksiyon analizinde fonksiyon; amacı, girdileri, çıktıları ve
 * kontrolü üzerinden tanımlanır.
 */
export const fmeaFunctionAspect = pgEnum("fmea_function_aspect", [
  "PURPOSE",
  "INPUT",
  "OUTPUT",
  "CONTROL",
]);

/**
 * Şiddet sınıflandırması (VDA "S-Klassifizierung").
 *
 * `SC1` ve `SC2` özel karakteristik adayıdır; `NONE` sınıflandırma yok.
 */
export const fmeaSeverityClassification = pgEnum("fmea_severity_classification", [
  "NONE",
  "SC1",
  "SC2",
]);

/**
 * Hata nedeni kategorisi.
 *
 * AIAG–VDA 4M sınıflandırması başlangıç noktasıdır; kurumun kendi
 * sınıflandırması da kullanılabilir. Bu yüzden `mes/enums.ts`'teki
 * `workElementCategory`'den ayrı tutulur.
 */
export const fmeaCauseCategory = pgEnum("fmea_cause_category", [
  "MAN",
  "MACHINE",
  "MATERIAL",
  "ENVIRONMENT",
  "METHOD",
  "MEASUREMENT",
  "OTHER",
]);

/** Kontrol tipi: önleme mi, algılama mı? */
export const fmeaControlType = pgEnum("fmea_control_type", ["PREVENTION", "DETECTION"]);

/**
 * Kontrol etkinliği.
 *
 * Önleme kontrolü etkinliği doğrudan O puanına, algılama kontrolü etkinliği
 * doğrudan D puanına yansır.
 */
export const fmeaControlEffectiveness = pgEnum("fmea_control_effectiveness", [
  "VERY_GOOD",
  "GOOD",
  "MODERATE",
  "POOR",
  "VERY_POOR",
]);

/** Aksiyon tipi. */
export const fmeaActionType = pgEnum("fmea_action_type", ["PREVENT", "DETECT", "IMPROVE"]);

/** Aksiyon durumu. */
export const fmeaActionStatus = pgEnum("fmea_action_status", ["OPEN", "IN_PROGRESS", "DONE"]);

/**
 * Özel karakteristik tipi.
 *
 * `PRODUCT` = pE (ürün özel karakteristiği), `PROCESS` = pS (proses özel
 * karakteristiği).
 */
export const fmeaCharacteristicType = pgEnum("fmea_characteristic_type", ["PRODUCT", "PROCESS"]);

/** Özel karakteristik durumu. */
export const fmeaCharacteristicStatus = pgEnum("fmea_characteristic_status", [
  "OPEN",
  "IDENTIFIED",
  "IMPLEMENTED",
  "VERIFIED",
]);

/**
 * Risk sınıflandırma yöntemi.
 *
 * Matris `fmea_risk_matrix` tablosunda tutulur; yöntem alanı ileride başka
 * sınıflandırma yöntemlerinin eklenmesine yer bırakır.
 */
export const fmeaRiskMethod = pgEnum("fmea_risk_method", ["RISK_CLASS"]);

/**
 * Action Priority hesaplama yöntemi.
 *
 * Matris `fmea_action_priority` tablosunda tutulur.
 */
export const fmeaActionPriorityMethod = pgEnum("fmea_action_priority_method", ["ACTION_PRIORITY"]);
