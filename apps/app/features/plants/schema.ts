import { z } from "zod";

/**
 * Tesis (üretim yeri) kayıtlarının giriş doğrulaması.
 *
 * Şemalar girdi ve çıktı tipleri aynı olacak şekilde kurulur; normalizasyon
 * ve boş değer dönüşümleri servis katmanında yapılır.
 */

/** Tesis durumu. */
export const plantStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Opsiyonel metin alanı. */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Tesis oluşturma ve güncelleme formu. */
export const plantFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Tesis kodu zorunludur.")
    .max(64, "Tesis kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Tesis adı zorunludur.")
    .max(200, "Tesis adı en fazla 200 karakter olabilir."),

  description: optionalText(1000),
  countryCode: optionalText(2),
  city: optionalText(120),
  address: optionalText(500),
  postalCode: optionalText(20),
  timezone: optionalText(80),

  status: plantStatusSchema,
});

export type PlantFormValues = z.infer<typeof plantFormSchema>;
