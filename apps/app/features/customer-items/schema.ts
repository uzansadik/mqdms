import { z } from "zod";

/**
 * Müşteri ürün referansı ve müşteri revision eşleştirmesi.
 *
 * Şirket içi ürün kodu ile müşteri parça numarası **bağımsız** yönetilir:
 * aynı ürünün farklı müşterilerde farklı parça numaraları olabilir.
 */

/** Müşteri ürün referansı formu. */
export const customerItemFormSchema = z.object({
  customerId: z.string().uuid("Geçersiz müşteri."),

  /** Müşteri ürünün bağlandığı ürün. */
  itemId: z.string().uuid("Geçersiz ürün."),

  /** Müşterinin kendi parça numarası (ör. `DTRF-100123`). */
  customerPartNumber: z
    .string()
    .trim()
    .min(1, "Müşteri parça numarası zorunludur.")
    .max(64, "Müşteri parça numarası en fazla 64 karakter olabilir."),

  /** Müşterinin kullandığı parça adı. */
  customerPartName: z.string().trim().max(200).optional().or(z.literal("")),

  description: z.string().trim().max(1000).optional().or(z.literal("")),

  /**
   * Kapsam (tesis, katalog).
   *
   * Müşteri aynı parça numarasını farklı kapsamlarda kullanıyorsa kapsam
   * tanımıyla ayrılır. Kapsamsız kayıtlar için boş string kullanılır.
   */
  scope: z.string().trim().max(64).optional().or(z.literal("")),

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CustomerItemFormValues = z.infer<typeof customerItemFormSchema>;

/** Müşteri revision eşleştirme formu. */
export const customerItemRevisionFormSchema = z.object({
  customerItemId: z.string().uuid("Geçersiz müşteri ürünü."),

  /** Müşterinin kendi revision değeri (ör. `C`). */
  customerRevision: z
    .string()
    .trim()
    .min(1, "Müşteri revision değeri zorunludur.")
    .max(64, "Müşteri revision değeri en fazla 64 karakter olabilir."),

  /**
   * Eşleşen iç ürün revision'ı.
   *
   * Taslakta opsiyoneldir; eşleştirme yapıldığında revision'ın ilgili ürüne
   * ait olduğu sunucuda doğrulanır.
   */
  internalItemRevisionId: z.string().uuid("Geçersiz revision.").optional().or(z.literal("")),

  /** Müşteri teknik resmi referansı. */
  drawingReference: z.string().trim().max(120).optional().or(z.literal("")),

  /** Müşteri resminin revision'ı. */
  drawingRevision: z.string().trim().max(64).optional().or(z.literal("")),

  description: z.string().trim().max(1000).optional().or(z.literal("")),

  status: z.enum(["DRAFT", "RELEASED", "SUPERSEDED"]),

  /** Yürürlük tarihi (`YYYY-AA-GG`). */
  effectiveFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih.")
    .optional()
    .or(z.literal("")),
});

export type CustomerItemRevisionFormValues = z.infer<typeof customerItemRevisionFormSchema>;
