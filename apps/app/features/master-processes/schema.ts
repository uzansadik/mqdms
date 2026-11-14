import { z } from "zod";

/**
 * Master Process form şeması.
 *
 * Master Process organizasyonun ortak proses tanımıdır; bir projeye ait
 * olmaz ve üzerinde operasyon numarası tutulmaz.
 */

/** Proses kategorileri. */
export const processCategorySchema = z.enum([
  "MANUFACTURING",
  "INSPECTION",
  "ASSEMBLY",
  "STORAGE",
  "TRANSPORT",
  "OUTSOURCED",
  "PACKAGING",
  "OTHER",
]);

export type ProcessCategory = z.infer<typeof processCategorySchema>;

/** Master Process form değerleri. */
export const processFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Proses kodu zorunludur.")
    .max(64, "Proses kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Proses adı zorunludur.")
    .max(200, "Proses adı en fazla 200 karakter olabilir."),

  description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir."),

  category: processCategorySchema,

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ProcessFormValues = z.infer<typeof processFormSchema>;
