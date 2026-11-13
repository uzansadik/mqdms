import { z } from "zod";

/**
 * BOM (bileşen yapısı) kayıtlarının giriş doğrulaması.
 *
 * BOM başlığı, BOM revision'ı ve BOM satırı ayrı kavramlardır: yayınlanmış
 * bir revision'ın içeriği doğrudan değiştirilemez, yeni değişiklik `DRAFT`
 * bir revision üzerinde yapılır.
 */

/** BOM'un amacı. */
export const bomTypeSchema = z.enum(["MANUFACTURING", "ENGINEERING", "OTHER"]);

/** BOM revision yaşam döngüsü. */
export const bomRevisionStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "RELEASED", "SUPERSEDED"]);

/** Bileşenlerin birleştirilme yöntemi. */
export const joiningMethodSchema = z.enum(["BONDING", "BOLTING", "WELDING", "RIVETING", "OTHER"]);

/** BOM oluşturma formu. */
export const bomFormSchema = z.object({
  /** BOM'un sahibi olan ürün. */
  itemId: z.string().uuid("Geçersiz ürün."),

  code: z
    .string()
    .trim()
    .min(1, "BOM kodu zorunludur.")
    .max(64, "BOM kodu en fazla 64 karakter olabilir.")
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(1, "BOM adı zorunludur.")
    .max(200, "BOM adı en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000).optional().or(z.literal("")),

  bomType: bomTypeSchema,

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type BomFormValues = z.infer<typeof bomFormSchema>;

/** BOM revision formu. */
export const bomRevisionFormSchema = z.object({
  bomId: z.string().uuid("Geçersiz BOM."),

  revision: z
    .string()
    .trim()
    .min(1, "Revision değeri zorunludur.")
    .max(64, "Revision değeri en fazla 64 karakter olabilir."),

  /** BOM'un sahibi ürünün teknik revision'ı; opsiyoneldir. */
  parentItemRevisionId: z.string().uuid("Geçersiz revision.").optional().or(z.literal("")),

  description: z.string().trim().max(2000).optional().or(z.literal("")),

  changeReason: z.string().trim().max(1000).optional().or(z.literal("")),

  status: bomRevisionStatusSchema,

  effectiveFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih.")
    .optional()
    .or(z.literal("")),

  sourceSystem: z.string().trim().max(64).optional().or(z.literal("")),

  sourceRevision: z.string().trim().max(64).optional().or(z.literal("")),
});

export type BomRevisionFormValues = z.infer<typeof bomRevisionFormSchema>;

/** BOM satırı formu. */
export const bomLineFormSchema = z.object({
  bomRevisionId: z.string().uuid("Geçersiz BOM revision."),

  /** Bileşen ürün. */
  childItemId: z.string().uuid("Geçersiz ürün."),

  /** Bileşenin belirli bir teknik revision'ı; opsiyoneldir. */
  childItemRevisionId: z.string().uuid("Geçersiz revision.").optional().or(z.literal("")),

  /**
   * Bileşenin kendi BOM revision'ı.
   *
   * Boş seçilirse alt BOM'un revision'ı belirlenmemiş demektir ve ilgili dal
   * çözümlenmemiş olarak gösterilir.
   */
  childBomRevisionId: z.string().uuid("Geçersiz BOM revision.").optional().or(z.literal("")),

  lineNumber: z.number().int().min(1, "Satır numarası pozitif olmalıdır."),

  /** Miktar; sıfırdan büyük olmalıdır. */
  quantity: z.number().positive("Miktar sıfırdan büyük olmalıdır."),

  unitOfMeasureId: z.string().uuid("Geçersiz birim.").optional().or(z.literal("")),

  description: z.string().trim().max(1000).optional().or(z.literal("")),

  referenceDesignation: z.string().trim().max(120).optional().or(z.literal("")),

  joiningMethod: joiningMethodSchema.optional(),

  notes: z.string().trim().max(2000).optional().or(z.literal("")),

  positionReference: z.string().trim().max(120).optional().or(z.literal("")),
});

export type BomLineFormValues = z.infer<typeof bomLineFormSchema>;
