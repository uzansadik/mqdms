import { z } from "zod";

/**
 * Proje kapsamındaki ürün kullanımı.
 *
 * Projeye ürün eklemek **yeni ürün kartı oluşturmaz**; organizasyonun ortak
 * item kütüphanesindeki mevcut bir ürüne ilişki kurulur.
 */

/** Proje kapsamındaki ürünün rolü. */
export const projectItemRoleSchema = z.enum([
  "DELIVERABLE",
  "COMPONENT",
  "RAW_MATERIAL",
  "AUXILIARY",
]);

/** Tedarik şekli override'ı. */
export const projectItemSupplyTypeSchema = z.enum([
  "MANUFACTURED",
  "PURCHASED",
  "OUTSOURCED",
  "MIXED",
  "UNKNOWN",
]);

/** Proje ürünü formu. */
export const projectItemFormSchema = z.object({
  projectId: z.string().uuid("Geçersiz proje."),

  /** Organizeasyonun ortak item kartı. */
  itemId: z.string().uuid("Geçersiz ürün."),

  /** Kullanılan item'ın belirli bir teknik revision'ı. */
  itemRevisionId: z.string().uuid("Geçersiz revision.").optional().or(z.literal("")),

  /** Müşteri parça numarası eşleştirmesi. */
  customerItemId: z.string().uuid("Geçersiz müşteri ürünü.").optional().or(z.literal("")),

  /** Müşteri revision eşleştirmesi. */
  customerItemRevisionId: z.string().uuid("Geçersiz revision.").optional().or(z.literal("")),

  /** Kullanılan BOM revision'ı. */
  bomRevisionId: z.string().uuid("Geçersiz BOM revision'ı.").optional().or(z.literal("")),

  itemRole: projectItemRoleSchema,

  /** Bu proje kapsamındaki tedarik şekli override'ı. */
  supplyTypeOverride: projectItemSupplyTypeSchema.optional(),

  description: z.string().trim().max(2000).optional().or(z.literal("")),

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ProjectItemFormValues = z.infer<typeof projectItemFormSchema>;
