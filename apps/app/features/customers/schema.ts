import { z } from "zod";

/**
 * Müşteri kayıtlarının giriş doğrulaması.
 *
 * Alan adları veritabanı kolon adlarıyla birebir aynıdır; form ile servis
 * arasında yeniden eşleme yapılmaz.
 *
 * Şemalar girdi ve çıktı tipleri aynı olacak şekilde kurulur (`z.infer` ile
 * kullanılabilir): normalizasyon ve boş değer dönüşümleri servis katmanında
 * yapılır.
 */

/** Müşteri durumu. */
export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Temsilci türü. */
export const customerContactTypeSchema = z.enum([
  "QUALITY",
  "PROJECT",
  "PURCHASING",
  "ENGINEERING",
  "LOGISTICS",
  "OTHER",
]);

/**
 * Opsiyonel metin alanı.
 *
 * Boş string geçerli bir değerdir; servis katmanında `null`'a çevrilir.
 */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Müşteri oluşturma ve güncelleme formu. */
export const customerFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Müşteri kodu zorunludur.")
    .max(64, "Müşteri kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Müşteri adı zorunludur.")
    .max(200, "Müşteri adı en fazla 200 karakter olabilir."),

  legalName: optionalText(200),
  description: optionalText(1000),
  website: optionalText(200),
  countryCode: optionalText(2),
  preferredLanguage: optionalText(10),

  /** Logonun depolamadaki nesne anahtarı; boşsa logo yoktur. */
  logoKey: z.string().max(512).nullable(),

  status: customerStatusSchema,
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

/** Müşteri sitesi (fabrika / teslimat lokasyonu) formu. */
export const customerSiteFormSchema = z.object({
  customerId: z.string().uuid("Geçersiz müşteri."),

  code: z
    .string()
    .trim()
    .min(1, "Site kodu zorunludur.")
    .max(64, "Site kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Site adı zorunludur.")
    .max(200, "Site adı en fazla 200 karakter olabilir."),

  countryCode: optionalText(2),
  city: optionalText(120),
  address: optionalText(500),
  postalCode: optionalText(20),
  description: optionalText(1000),

  status: customerStatusSchema,
});

export type CustomerSiteFormValues = z.infer<typeof customerSiteFormSchema>;

/** Müşteri temsilcisi formu. */
export const customerContactFormSchema = z.object({
  customerId: z.string().uuid("Geçersiz müşteri."),

  /** Boş seçilirse temsilci müşteri geneline bağlıdır. */
  customerSiteId: z.string().uuid("Geçersiz site.").optional().or(z.literal("")),

  firstName: z
    .string()
    .trim()
    .min(1, "Ad zorunludur.")
    .max(120, "Ad en fazla 120 karakter olabilir."),

  lastName: z
    .string()
    .trim()
    .min(1, "Soyad zorunludur.")
    .max(120, "Soyad en fazla 120 karakter olabilir."),

  jobTitle: optionalText(120),
  department: optionalText(120),

  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((value) => value === undefined || value === "" || z.email().safeParse(value).success, {
      message: "Geçersiz e-posta adresi.",
    }),

  phone: optionalText(40),
  notes: optionalText(2000),

  contactType: customerContactTypeSchema,
  status: customerStatusSchema,
});

export type CustomerContactFormValues = z.infer<typeof customerContactFormSchema>;
