import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Envanter alanının ortak enum'ları.
 *
 * `record_status` Phase 1'deki tablo başına enum'lar yerine paylaşılan bir
 * enum olarak kullanılır: envanter alanında onlarca tablo var ve hepsi aynı
 * iki durumu taşıyor.
 */

/** Kaydın kullanılabilir olup olmadığı. */
export const recordStatus = pgEnum("record_status", ["ACTIVE", "INACTIVE"]);

/** Ölçüm boyutu. Aynı boyuttaki birimler arasında dönüşüm tanımlanabilir. */
export const unitDimension = pgEnum("unit_dimension", [
  "MASS",
  "LENGTH",
  "AREA",
  "VOLUME",
  "COUNT",
  "OTHER",
]);

/**
 * Ürünün şirket içi tipi.
 *
 * `supply_type` ile bağımsızdır: bir parça başka bir tesiste üretilen
 * (MANUFACTURED), başka bir tesiste satın alınan (PURCHASED) bir bileşen
 * olabilir.
 */
export const itemType = pgEnum("item_type", [
  "FINISHED_GOOD",
  "SEMI_FINISHED",
  "RAW_MATERIAL",
  "COMPONENT",
  "CONSUMABLE",
  "OTHER",
]);

/** Ürünün varsayılan tedarik şekli. */
export const supplyType = pgEnum("supply_type", [
  "MANUFACTURED",
  "PURCHASED",
  "OUTSOURCED",
  "MIXED",
  "UNKNOWN",
]);

/**
 * Revision yaşam döngüsü.
 *
 * Yayınlanmış (RELEASED) revision teknik içerik olarak değiştirilemez; yeni
 * bir teknik değişiklik için yeni revision oluşturulur.
 */
export const revisionStatus = pgEnum("revision_status", ["DRAFT", "RELEASED", "SUPERSEDED"]);

/** BOM'un amacı. */
export const bomType = pgEnum("bom_type", ["MANUFACTURING", "ENGINEERING", "OTHER"]);

/** BOM revision yaşam döngüsü. */
export const bomRevisionStatus = pgEnum("bom_revision_status", [
  "DRAFT",
  "IN_REVIEW",
  "RELEASED",
  "SUPERSEDED",
]);

/** BOM satırındaki bileşenlerin birleştirilme yöntemi. */
export const joiningMethod = pgEnum("joining_method", [
  "BONDING",
  "BOLTING",
  "WELDING",
  "RIVETING",
  "OTHER",
]);

/** Proje kapsamındaki ürünün rolü. */
export const projectItemRole = pgEnum("project_item_role", [
  "DELIVERABLE",
  "COMPONENT",
  "RAW_MATERIAL",
  "AUXILIARY",
]);

/** Import işleminin türü. */
export const importType = pgEnum("import_type", [
  "ITEM",
  "ITEM_GROUP_MAPPING",
  "CUSTOMER_ITEM",
  "BOM",
]);

/**
 * Import işinin durumu.
 *
 * Bir import hiçbir zaman doğrudan mevcut veriyi değiştirmez: önce
 * `VALIDATING` → `READY` → `CONFLICT` aşamalarından geçer, kullanıcı
 * onayından sonra `RUNNING` olur.
 */
export const importStatus = pgEnum("import_status", [
  "PENDING",
  "PARSING",
  "VALIDATING",
  "READY",
  "CONFLICT",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
