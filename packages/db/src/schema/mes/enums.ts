import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Proses yönetimi alanının enum'ları.
 *
 * `supply_type` ve `joining_method` envanter alanının mevcut enum'larıdır;
 * burada yeniden oluşturulmaz — aynı değerler paylaşılır.
 */

/** Master Process kategorisi. */
export const processCategory = pgEnum("process_category", [
  "MANUFACTURING",
  "INSPECTION",
  "ASSEMBLY",
  "STORAGE",
  "TRANSPORT",
  "OUTSOURCED",
  "PACKAGING",
  "OTHER",
]);

/**
 * Process Variant tipi.
 *
 * `GENERIC` jenerik uygulamadır; `SPECIALIZED` bir jenerik varyanttan
 * türetilmiş ya da bağımsız oluşturulmuş özelleştirmedir.
 */
export const processVariantType = pgEnum("process_variant_type", ["GENERIC", "SPECIALIZED"]);

/**
 * Process Variant Revision yaşam döngüsü.
 *
 * Yayınlanmış (`RELEASED`) revision teknik içerik olarak değiştirilemez;
 * yeni bir teknik değişiklik için yeni `DRAFT` revision oluşturulur.
 */
export const processVariantRevisionStatus = pgEnum("process_variant_revision_status", [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "RELEASED",
  "SUPERSEDED",
]);

/** Flow'un sahibi. */
export const flowType = pgEnum("flow_type", ["PROCESS_VARIANT", "PROCESS_STEP", "PROCESS_FLOW"]);

/**
 * Flow Node tipi.
 *
 * Son iki tip proje entegrasyonu içindir ve bu fazda yalnızca katalogda
 * tanımlıdır.
 */
export const flowNodeType = pgEnum("flow_node_type", [
  "START",
  "END",
  "ACTIVITY",
  "INSPECTION",
  "DECISION",
  "STORAGE",
  "TRANSPORT",
  "DOCUMENT",
  "SUBPROCESS",
  "PROCESS_STEP_REFERENCE",
  "PROCESS_FLOW_REFERENCE",
]);

/**
 * Flow Edge tipi.
 *
 * `condition` alanı yalnızca dokümantasyon amaçlıdır; çalıştırılabilir kod
 * kabul etmez.
 */
export const flowEdgeType = pgEnum("flow_edge_type", [
  "DEFAULT",
  "YES",
  "NO",
  "OK",
  "NOK",
  "CONDITIONAL",
  "REWORK",
  "MATERIAL_FLOW",
]);

/**
 * Process Work Element kategorisi (AIAG–VDA 4M).
 *
 * Başlangıç sınıflandırmasıdır: `MAN`, `MACHINE`, `MATERIAL` ve
 * `ENVIRONMENT`. Organizasyonun kendi sınıflandırması zorunlu değildir.
 */
export const workElementCategory = pgEnum("work_element_category", [
  "MAN",
  "MACHINE",
  "MATERIAL",
  "ENVIRONMENT",
]);

/**
 * Proses fonksiyonunun kapsamı.
 *
 * `PROCESS` seviyesindeki fonksiyonlar prosesin tamamına, `WORK_ELEMENT`
 * seviyesindekiler tek bir iş unsuruna aittir.
 */
export const processFunctionScope = pgEnum("process_function_scope", ["PROCESS", "WORK_ELEMENT"]);

/** Proses gerekliliğinin tipi. */
export const processRequirementType = pgEnum("process_requirement_type", [
  "PRODUCT",
  "PROCESS",
  "CUSTOMER",
  "REGULATORY",
  "INTERNAL",
  "DOCUMENTATION",
]);

/** Proses girdi/çıktı yönü. */
export const processIoDirection = pgEnum("process_io_direction", ["INPUT", "OUTPUT"]);

/** Proses girdi/çıktı kaynak tipi. */
export const processIoResourceType = pgEnum("process_io_resource_type", [
  "PRODUCT",
  "MATERIAL",
  "SEMI_FINISHED",
  "DOCUMENT",
  "INFORMATION",
  "TOOLING",
  "OTHER",
]);
