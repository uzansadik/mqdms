import { z } from "zod";

/**
 * Process Work Element şeması.
 *
 * Work Element, AIAG–VDA PFMEA yapısında kullanılan gerçek proses unsurudur:
 * operatör, kumpas, reçine, kontrol ortamı. Flow Node'dan bağımsız bir
 * entity'dir; ikisi many-to-many ilişkiyle bağlanır.
 */

/** AIAG–VDA 4M kategorileri. */
export const workElementCategorySchema = z.enum(["MAN", "MACHINE", "MATERIAL", "ENVIRONMENT"]);

export type WorkElementCategory = z.infer<typeof workElementCategorySchema>;

/** Work Element form değerleri. */
export const workElementFormSchema = z.object({
  /** Ait olduğu Process Variant Revision. */
  processVariantRevisionId: z.string().uuid("Geçersiz revision."),

  code: z.string().trim().min(1, "Kod zorunludur.").max(64, "Kod en fazla 64 karakter olabilir."),

  name: z.string().trim().min(1, "Ad zorunludur.").max(200, "Ad en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  category: workElementCategorySchema,

  /** `MATERIAL` kategorisi için isteğe bağlı item referansı. */
  itemId: z.string().uuid().nullable(),

  /** `MATERIAL` kategorisi için isteğe bağlı item grup referansı. */
  itemGroupId: z.string().uuid().nullable(),
});

export type WorkElementFormValues = z.infer<typeof workElementFormSchema>;

/** Flow Node ile Work Element ilişkisi. */
export const nodeWorkElementLinkSchema = z.object({
  flowNodeId: z.string().uuid("Geçersiz node."),

  processWorkElementId: z.string().uuid("Geçersiz work element."),

  description: z.string().trim().max(2000).optional(),
});

export type NodeWorkElementLinkValues = z.infer<typeof nodeWorkElementLinkSchema>;
