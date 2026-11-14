import { z } from "zod";

/**
 * Process Input/Output ve Applicability şeması.
 *
 * Girdi ve çıktı tanımları **isteğe bağlıdır**: her proses adımından sonra
 * yeni bir item veya yarı mamul oluşturmak zorunlu değildir.
 */

/** Girdi/çıktı yönü. */
export const processIoDirectionSchema = z.enum(["INPUT", "OUTPUT"]);

export type ProcessIoDirection = z.infer<typeof processIoDirectionSchema>;

/** Girdi/çıktı kaynak tipi. */
export const processIoResourceTypeSchema = z.enum([
  "PRODUCT",
  "MATERIAL",
  "SEMI_FINISHED",
  "DOCUMENT",
  "INFORMATION",
  "TOOLING",
  "OTHER",
]);

export type ProcessIoResourceType = z.infer<typeof processIoResourceTypeSchema>;

/** Input/Output form değerleri. */
export const processIoFormSchema = z.object({
  processVariantRevisionId: z.string().uuid("Geçersiz revision."),

  direction: processIoDirectionSchema,

  resourceType: processIoResourceTypeSchema,

  name: z.string().trim().min(1, "Ad zorunludur.").max(200, "Ad en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  itemGroupId: z.string().uuid().nullable(),

  itemId: z.string().uuid().nullable(),

  /** Proses durumu; zorunlu değildir. */
  processState: z.string().trim().max(200),

  isRequired: z.boolean(),
});

export type ProcessIoFormValues = z.infer<typeof processIoFormSchema>;

/** Applicability form değerleri. */
export const processApplicabilityFormSchema = z.object({
  processVariantRevisionId: z.string().uuid("Geçersiz revision."),

  name: z.string().trim().min(1, "Ad zorunludur.").max(200, "Ad en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  /** Tedarik şekli koşulu. */
  supplyType: z.enum(["MANUFACTURED", "PURCHASED", "OUTSOURCED", "MIXED", "UNKNOWN"]).nullable(),

  /** Birleştirme yöntemi koşulu. */
  joiningMethod: z.enum(["BONDING", "BOLTING", "WELDING", "RIVETING", "OTHER"]).nullable(),

  isActive: z.boolean(),

  /** Kapsama dahil edilecek item grupları. */
  itemGroupIds: z
    .array(z.string().uuid())
    .max(50, "En fazla 50 item grubu seçilebilir.")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Aynı item grubu birden fazla kez seçilemez.",
    }),
});

export type ProcessApplicabilityFormValues = z.infer<typeof processApplicabilityFormSchema>;
