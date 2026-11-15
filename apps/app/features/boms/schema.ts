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

/** Ürünün yapısal niteliği. */
export const itemStructureTypeSchema = z.enum(["ASSEMBLY", "GROUP", "PART"]);

/** UUID ya da istemcide üretilmiş geçici satır kimliği. */
const lineIdSchema = z
  .string()
  .regex(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|new:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    "Geçersiz satır kimliği.",
  );

/** BOM oluşturma / düzenleme formu. */
export const bomFormSchema = z.object({
  /** BOM'un sahibi olan ürün. Oluşturma sonrası değiştirilemez. */
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
});

export type BomFormValues = z.infer<typeof bomFormSchema>;

/** Yeni revision talebi. */
export const bomNextRevisionSchema = z.object({
  bomId: z.string().uuid("Geçersiz BOM."),

  changeReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BomNextRevisionValues = z.infer<typeof bomNextRevisionSchema>;

/**
 * Taslak satır.
 *
 * `id` mevcut satırın kimliği ya da `new:` ile başlayan istemci tarafından
 * üretilmiş geçici kimliktir. Geçici kimlikler sunucuda gerçek satır
 * kimlikleriyle eşleştirilir.
 */
export const bomDraftLineSchema = z.object({
  id: lineIdSchema,

  /** Üst satır; null ise satır kökün altındadır. */
  parentLineId: lineIdSchema.nullable(),

  /** Bileşen ürün. */
  childItemId: z.string().uuid("Geçersiz ürün."),

  /** Bileşenin belirli bir teknik revision'ı; opsiyoneldir. */
  childItemRevisionId: z.string().uuid("Geçersiz revision.").nullable().optional(),

  /** Miktar; sıfırdan büyük olmalıdır. */
  quantity: z.number().positive("Miktar sıfırdan büyük olmalıdır."),

  /** Miktar birimi; boş bırakılırsa ürünün varsayılan birimi kullanılır. */
  unitOfMeasureId: z.string().uuid("Geçersiz birim.").nullable().optional(),

  /** Ebeveyn içindeki sıra. */
  sortOrder: z.number().int().min(0).max(9999),

  description: z.string().trim().max(1000).nullable().optional(),

  referenceDesignation: z.string().trim().max(120).nullable().optional(),

  joiningMethod: joiningMethodSchema.nullable().optional(),

  notes: z.string().trim().max(2000).nullable().optional(),

  positionReference: z.string().trim().max(120).nullable().optional(),
});

export type BomDraftLineValues = z.infer<typeof bomDraftLineSchema>;

/**
 * Taslak kaydetme isteği.
 *
 * İstemci, düzenlediği ağacın tamamını gönderir; sunucu farkı hesaplayıp
 * ekleme, güncelleme, taşıma ve silme işlemlerini tek transaction'da yapar.
 */
export const bomDraftSaveSchema = z.object({
  revisionId: z.string().uuid("Geçersiz BOM revision."),

  /** İstemcinin gördüğü sürüm; eşleşmezse çakışma bildirilir. */
  expectedLockVersion: z.number().int().min(1),

  lines: z.array(bomDraftLineSchema).max(5000, "Bir taslakta en fazla 5000 satır olabilir."),
});

export type BomDraftSaveValues = z.infer<typeof bomDraftSaveSchema>;
