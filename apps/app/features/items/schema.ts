import { z } from "zod";

/**
 * Ürün kartının giriş doğrulaması.
 *
 * `code` **birebir** saklanır: ERP'deki başındaki sıfırlar, noktalar ve
 * tireler korunur. Benzersizlik veritabanında büyük/küçük harf duyarsız
 * yapılır, kodun kendisi normalize edilmez.
 */

export const itemTypeSchema = z.enum([
  "FINISHED_GOOD",
  "SEMI_FINISHED",
  "RAW_MATERIAL",
  "COMPONENT",
  "CONSUMABLE",
  "OTHER",
]);

export const supplyTypeSchema = z.enum([
  "MANUFACTURED",
  "PURCHASED",
  "OUTSOURCED",
  "MIXED",
  "UNKNOWN",
]);

export const itemStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Ürün oluşturma ve güncelleme formu. */
export const itemFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Ürün kodu zorunludur.")
    .max(64, "Ürün kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Ürün adı zorunludur.")
    .max(200, "Ürün adı en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000).optional().or(z.literal("")),

  /** Sınıflandırma grubu; eksik olabilir (taslak ürün). */
  itemGroupId: z.string().uuid("Geçersiz ürün grubu.").optional().or(z.literal("")),

  itemType: itemTypeSchema,

  /**
   * Varsayılan tedarik şekli; proje kapsamında override edilebilir.
   *
   * Boş seçim ("" ) "belirtilmemiş" anlamına gelir.
   */
  supplyType: z.union([supplyTypeSchema, z.literal("")]).optional(),

  unitOfMeasureId: z.string().uuid("Geçersiz birim."),

  status: itemStatusSchema,
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

/** Ürün grubu oluşturma ve güncelleme formu. */
export const itemGroupFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Grup kodu zorunludur.")
    .max(64, "Grup kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Grup adı zorunludur.")
    .max(200, "Grup adı en fazla 200 karakter olabilir."),

  description: z.string().trim().max(1000).optional().or(z.literal("")),

  /** Üst grup; kök gruplarda boştur. */
  parentId: z.string().uuid("Geçersiz üst grup.").optional().or(z.literal("")),

  sortOrder: z.number().int().min(0).max(9999),

  status: itemStatusSchema,
});

export type ItemGroupFormValues = z.infer<typeof itemGroupFormSchema>;
