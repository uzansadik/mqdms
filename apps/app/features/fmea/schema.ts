import { z } from "zod";

/**
 * FMEA modülünün giriş doğrulaması.
 *
 * Şemalar girdi ve çıktı tipleri aynı olacak şekilde kurulur; normalizasyon
 * ve boş değer dönüşümleri servis katmanında yapılır.
 */

/** FMEA tipi. */
export const fmeaTypeSchema = z.enum(["PFMEA", "DFMEA", "SFMEA"]);

/** Değerlendirme yöntemi. */
export const fmeaEvaluationMethodSchema = z.enum(["ACTION_PRIORITY", "RAG", "BOTH"]);

/** Sistem yapısı seviyesi. */
export const fmeaStructureLevelSchema = z.enum(["SYSTEM", "SUBSYSTEM", "COMPONENT"]);

/** Fonksiyon aspekti. */
export const fmeaFunctionAspectSchema = z.enum(["PURPOSE", "INPUT", "OUTPUT", "CONTROL"]);

/** Şiddet sınıflandırması. */
export const fmeaSeverityClassificationSchema = z.enum(["NONE", "SC1", "SC2"]);

/** Hata nedeni kategorisi. */
export const fmeaCauseCategorySchema = z.enum([
  "MAN",
  "MACHINE",
  "MATERIAL",
  "ENVIRONMENT",
  "METHOD",
  "MEASUREMENT",
  "OTHER",
]);

/** Kontrol tipi. */
export const fmeaControlTypeSchema = z.enum(["PREVENTION", "DETECTION"]);

/** Kontrol etkinliği. */
export const fmeaControlEffectivenessSchema = z.enum([
  "VERY_GOOD",
  "GOOD",
  "MODERATE",
  "POOR",
  "VERY_POOR",
]);

/** Aksiyon tipi. */
export const fmeaActionTypeSchema = z.enum(["PREVENT", "DETECT", "IMPROVE"]);

/** Aksiyon durumu. */
export const fmeaActionStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE"]);

/** Özel karakteristik tipi. */
export const fmeaCharacteristicTypeSchema = z.enum(["PRODUCT", "PROCESS"]);

/** Özel karakteristik durumu. */
export const fmeaCharacteristicStatusSchema = z.enum([
  "OPEN",
  "IDENTIFIED",
  "IMPLEMENTED",
  "VERIFIED",
]);

/** Enum tipleri; repository ve servis katmanında kullanılır. */
export type FmeaType = z.infer<typeof fmeaTypeSchema>;
export type FmeaEvaluationMethod = z.infer<typeof fmeaEvaluationMethodSchema>;
export type FmeaStructureLevel = z.infer<typeof fmeaStructureLevelSchema>;
export type FmeaFunctionAspect = z.infer<typeof fmeaFunctionAspectSchema>;
export type FmeaSeverityClassification = z.infer<typeof fmeaSeverityClassificationSchema>;
export type FmeaCauseCategory = z.infer<typeof fmeaCauseCategorySchema>;
export type FmeaControlType = z.infer<typeof fmeaControlTypeSchema>;
export type FmeaControlEffectiveness = z.infer<typeof fmeaControlEffectivenessSchema>;
export type FmeaActionType = z.infer<typeof fmeaActionTypeSchema>;
export type FmeaActionStatus = z.infer<typeof fmeaActionStatusSchema>;
export type FmeaCharacteristicType = z.infer<typeof fmeaCharacteristicTypeSchema>;
export type FmeaCharacteristicStatus = z.infer<typeof fmeaCharacteristicStatusSchema>;

/** Opsiyonel metin alanı. */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
/** UUID alanı; boş dize `null` olarak kabul edilir. */
const optionalId = z
  .string()
  .trim()
  .uuid("Geçerli bir kayıt seçilmelidir.")
  .optional()
  .or(z.literal(""));

/** 1–10 aralığında derece. */
const rating = (label: string) =>
  z.coerce
    .number({ message: `${label} 1 ile 10 arasında olmalıdır.` })
    .int(`${label} tam sayı olmalıdır.`)
    .min(1, `${label} en az 1 olmalıdır.`)
    .max(10, `${label} en fazla 10 olmalıdır.`);

/** FMEA belgesi oluşturma ve güncelleme formu. */
export const fmeaDocumentFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Belge kodu zorunludur.")
    .max(64, "Belge kodu en fazla 64 karakter olabilir."),
  name: z
    .string()
    .trim()
    .min(1, "Belge adı zorunludur.")
    .max(200, "Belge adı en fazla 200 karakter olabilir."),
  description: optionalText(2000),
  fmeaType: fmeaTypeSchema,
  evaluationMethod: fmeaEvaluationMethodSchema,
  scopeDescription: optionalText(4000),
  responsibility: optionalText(200),
  targetDate: optionalText(20),
});

export type FmeaDocumentFormValues = z.infer<typeof fmeaDocumentFormSchema>;

/** Yapı elemanı formu. */
export const fmeaStructureElementFormSchema = z.object({
  parentId: optionalId,
  level: fmeaStructureLevelSchema,
  code: z.string().trim().min(1, "Kod zorunludur.").max(64, "Kod en fazla 64 karakter olabilir."),
  name: z.string().trim().min(1, "Ad zorunludur.").max(200, "Ad en fazla 200 karakter olabilir."),
  description: optionalText(2000),
  flowNodeId: optionalId,
  itemId: optionalId,
  processWorkElementId: optionalId,
  isSpecialCharacteristic: z.boolean(),
});

export type FmeaStructureElementFormValues = z.infer<typeof fmeaStructureElementFormSchema>;

/** Fonksiyon formu. */
export const fmeaFunctionFormSchema = z.object({
  structureElementId: optionalId,
  processFunctionId: optionalId,
  name: z
    .string()
    .trim()
    .min(1, "Fonksiyon adı zorunludur.")
    .max(300, "Fonksiyon adı en fazla 300 karakter olabilir."),
  description: optionalText(2000),
  functionAspect: fmeaFunctionAspectSchema,
  requirementText: optionalText(2000),
  isSpecialCharacteristic: z.boolean(),
});

export type FmeaFunctionFormValues = z.infer<typeof fmeaFunctionFormSchema>;

/** Hata modu formu. */
export const fmeaFailureModeFormSchema = z.object({
  structureElementId: z.string().trim().uuid("Hata modu bir yapı elemanına bağlanmalıdır."),
  functionId: optionalId,
  failureMode: z
    .string()
    .trim()
    .min(1, "Hata modu zorunludur.")
    .max(500, "Hata modu en fazla 500 karakter olabilir."),
  failureEffectLocal: optionalText(2000),
  failureEffectEnd: optionalText(2000),
  severity: rating("Şiddet"),
  severityClassification: fmeaSeverityClassificationSchema,
});

export type FmeaFailureModeFormValues = z.infer<typeof fmeaFailureModeFormSchema>;

/** Hata nedeni formu. */
export const fmeaFailureCauseFormSchema = z.object({
  failureModeId: z.string().trim().uuid("Hata nedeni bir hata moduna bağlanmalıdır."),
  cause: z
    .string()
    .trim()
    .min(1, "Hata nedeni zorunludur.")
    .max(500, "Hata nedeni en fazla 500 karakter olabilir."),
  causeCategory: fmeaCauseCategorySchema,
  processWorkElementId: optionalId,
  processFunctionId: optionalId,
  occurrence: rating("Oluşma"),
  detection: rating("Algılama"),
});

export type FmeaFailureCauseFormValues = z.infer<typeof fmeaFailureCauseFormSchema>;

/** Önleme / algılama kontrolü formu. */
export const fmeaControlFormSchema = z.object({
  failureCauseId: z.string().trim().uuid("Kontrol bir hata nedenine bağlanmalıdır."),
  controlType: fmeaControlTypeSchema,
  description: z
    .string()
    .trim()
    .min(1, "Kontrol açıklaması zorunludur.")
    .max(2000, "Kontrol açıklaması en fazla 2000 karakter olabilir."),
  effectiveness: fmeaControlEffectivenessSchema,
  processFunctionId: optionalId,
});

export type FmeaControlFormValues = z.infer<typeof fmeaControlFormSchema>;

/** Aksiyon formu. */
export const fmeaActionFormSchema = z
  .object({
    failureModeId: optionalId,
    failureCauseId: optionalId,
    actionType: fmeaActionTypeSchema,
    description: z
      .string()
      .trim()
      .min(1, "Aksiyon açıklaması zorunludur.")
      .max(4000, "Aksiyon açıklaması en fazla 4000 karakter olabilir."),
    responsibleId: optionalId,
    responsibleText: optionalText(200),
    targetDate: optionalText(20),
    status: fmeaActionStatusSchema,
    verificationOfEffectiveness: optionalText(2000),
    isSpecialAction: z.boolean(),
  })
  .refine((value) => Boolean(value.failureModeId) || Boolean(value.failureCauseId), {
    message: "Aksiyon bir hata moduna veya bir hata nedenine bağlanmalıdır.",
  });

export type FmeaActionFormValues = z.infer<typeof fmeaActionFormSchema>;

/** Özel karakteristik formu. */
export const fmeaSpecialCharacteristicFormSchema = z
  .object({
    structureElementId: optionalId,
    functionId: optionalId,
    failureModeId: optionalId,
    characteristicType: fmeaCharacteristicTypeSchema,
    scClass: optionalText(10),
    reason: optionalText(2000),
    status: fmeaCharacteristicStatusSchema,
  })
  .refine(
    (value) =>
      Boolean(value.structureElementId) ||
      Boolean(value.functionId) ||
      Boolean(value.failureModeId),
    {
      message: "Özel karakteristik bir yapı elemanına, fonksiyona veya hata moduna bağlanmalıdır.",
    },
  );

export type FmeaSpecialCharacteristicFormValues = z.infer<
  typeof fmeaSpecialCharacteristicFormSchema
>;

/** Belge yaşam döngüsü geçişi. */
export const fmeaDocumentTransitionSchema = z.object({
  documentId: z.string().trim().uuid("Belge zorunludur."),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "RELEASED"]),
  reason: optionalText(1000),
});

export type FmeaDocumentTransitionValues = z.infer<typeof fmeaDocumentTransitionSchema>;

/**
 * Yapı ağacının kaynaktan içe aktarımı.
 *
 * Kaynak tipi belge tipine göre belirlenir; isteğe bağlı olarak yalnızca
 * belirli bir kayıt içe aktarılabilir.
 */
export const fmeaSourceImportSchema = z.object({
  documentId: z.string().trim().uuid("Belge zorunludur."),
  source: z.enum(["FLOW", "ITEM", "PROCESS"]),
  sourceId: optionalId,
});

export type FmeaSourceImportValues = z.infer<typeof fmeaSourceImportSchema>;

/**
 * Değerlendirme matrislerinin güncellenmesi.
 *
 * Action Priority matrisi bant hâlindedir; risk sınıfı matrisi her
 * (şiddet, oluşma) çifti için tek bir sınıf taşır.
 */
export const fmeaMatrixUpdateSchema = z.object({
  actionPriority: z.array(
    z.object({
      severityMin: z.coerce.number().int().min(1).max(10),
      severityMax: z.coerce.number().int().min(1).max(10),
      occurrenceMin: z.coerce.number().int().min(1).max(10),
      occurrenceMax: z.coerce.number().int().min(1).max(10),
      detectionMin: z.coerce.number().int().min(1).max(10),
      detectionMax: z.coerce.number().int().min(1).max(10),
      actionPriority: z.enum(["H", "M", "L"]),
    }),
  ),
  riskClass: z.array(
    z.object({
      severity: z.coerce.number().int().min(1).max(10),
      occurrence: z.coerce.number().int().min(1).max(10),
      riskClass: z.enum(["A", "B", "C"]),
    }),
  ),
});

export type FmeaMatrixUpdateValues = z.infer<typeof fmeaMatrixUpdateSchema>;
