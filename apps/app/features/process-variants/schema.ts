import { z } from "zod";

/**
 * Process Variant form şeması.
 *
 * Process Variant, Master Process'in belirli bir uygulamasıdır. Teknik içeriği
 * revision üzerinden yönetilir; varyantın kendisi yalnızca kimlik ve sınıf
 * bilgisini taşır.
 */

/** Varyant tipi. */
export const processVariantTypeSchema = z.enum(["GENERIC", "SPECIALIZED"]);

export type ProcessVariantType = z.infer<typeof processVariantTypeSchema>;

/** Varyant form değerleri. */
export const processVariantFormSchema = z.object({
  /** Ait olduğu Master Process. */
  processId: z.string().uuid("Geçersiz proses."),

  code: z
    .string()
    .trim()
    .min(1, "Varyant kodu zorunludur.")
    .max(64, "Varyant kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Varyant adı zorunludur.")
    .max(200, "Varyant adı en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  variantType: processVariantTypeSchema,

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ProcessVariantFormValues = z.infer<typeof processVariantFormSchema>;

/**
 * Revision form değerleri.
 *
 * Revision değeri varyant içinde unique'tir ve metin olarak saklanır
 * (`REV.01` gibi).
 */
export const processVariantRevisionFormSchema = z.object({
  revision: z
    .string()
    .trim()
    .min(1, "Revision değeri zorunludur.")
    .max(64, "Revision değeri en fazla 64 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  changeReason: z.string().trim().max(2000, "Değişiklik sebebi en fazla 2000 karakter olabilir."),
});

export type ProcessVariantRevisionFormValues = z.infer<typeof processVariantRevisionFormSchema>;

/**
 * Geri alma gerekçesi.
 *
 * `IN_REVIEW → DRAFT` ve `APPROVED → DRAFT` geçişlerinde kullanıcı nedenini
 * yazar; gerekçe audit kaydında saklanır.
 */
export const processVariantReviewReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Gerekçe zorunludur.")
    .max(2000, "Gerekçe en fazla 2000 karakter olabilir."),
});

export type ProcessVariantReviewReasonValues = z.infer<typeof processVariantReviewReasonSchema>;
