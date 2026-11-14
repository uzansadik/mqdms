import { z } from "zod";

/**
 * Process Function ve Requirement şeması.
 *
 * Fonksiyonlar ve gereklilikler AIAG–VDA fonksiyon analizinin veri temelidir.
 * Bu fazda tam fonksiyon ağı ve hata analizi geliştirilmez.
 */

/** Fonksiyon kapsamı. */
export const processFunctionScopeSchema = z.enum(["PROCESS", "WORK_ELEMENT"]);

export type ProcessFunctionScope = z.infer<typeof processFunctionScopeSchema>;

/** Gereklilik tipi. */
export const processRequirementTypeSchema = z.enum([
  "PRODUCT",
  "PROCESS",
  "CUSTOMER",
  "REGULATORY",
  "INTERNAL",
  "DOCUMENTATION",
]);

export type ProcessRequirementType = z.infer<typeof processRequirementTypeSchema>;

/** Function form değerleri. */
export const processFunctionFormSchema = z.object({
  processVariantRevisionId: z.string().uuid("Geçersiz revision."),

  name: z.string().trim().min(1, "Ad zorunludur.").max(300, "Ad en fazla 300 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  functionScope: processFunctionScopeSchema,

  /** `WORK_ELEMENT` kapsamlı fonksiyonların bağlandığı iş unsuru. */
  processWorkElementId: z.string().uuid().nullable(),
});

export type ProcessFunctionFormValues = z.infer<typeof processFunctionFormSchema>;

/** Requirement form değerleri. */
export const processRequirementFormSchema = z.object({
  processVariantRevisionId: z.string().uuid("Geçersiz revision."),

  code: z.string().trim().min(1, "Kod zorunludur.").max(64, "Kod en fazla 64 karakter olabilir."),

  name: z.string().trim().min(1, "Ad zorunludur.").max(300, "Ad en fazla 300 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  requirementType: processRequirementTypeSchema,

  /** Gerekliliğin dayandığı kaynak (ör. teknik resim numarası). */
  sourceReference: z.string().trim().max(200),

  isMandatory: z.boolean(),
});

export type ProcessRequirementFormValues = z.infer<typeof processRequirementFormSchema>;

/** Function ↔ Requirement ilişkisi. */
export const functionRequirementLinkSchema = z.object({
  processFunctionId: z.string().uuid("Geçersiz fonksiyon."),
  processRequirementId: z.string().uuid("Geçersiz gereklilik."),
});

export type FunctionRequirementLinkValues = z.infer<typeof functionRequirementLinkSchema>;
