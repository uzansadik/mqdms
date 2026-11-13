import { z } from "zod";

/**
 * Proje ve proje ekibi kayıtlarının giriş doğrulaması.
 *
 * Şemalar girdi ve çıktı tipleri aynı olacak şekilde kurulur; normalizasyon
 * ve boş değer dönüşümleri servis katmanında yapılır.
 */

/** Proje durumu. */
export const projectStatusSchema = z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);

/**
 * Proje içi rol.
 *
 * Merkezi kimlik doğrulama permission rolünden bağımsızdır: bir üyeyi proje
 * müdürü yapmak yeni bir auth permission vermez.
 */
export const projectRoleSchema = z.enum([
  "PROJECT_MANAGER",
  "PROJECT_ENGINEER",
  "QUALITY_MANAGER",
  "QUALITY_ENGINEER",
  "PROCESS_ENGINEER",
  "PRODUCTION_RESPONSIBLE",
  "OTHER",
]);

/** Proje içi rol. */
export type ProjectRole = z.infer<typeof projectRoleSchema>;

/** Opsiyonel metin alanı. */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Opsiyonel tarih alanı (`YYYY-MM-DD`). */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => value === undefined || value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Geçersiz tarih.",
  });

/**
 * Proje formunun ortak alanları.
 *
 * Tarihlerin mantıksal sırası şemada değil servis katmanında doğrulanır:
 * iş kuralı bileşen içinde değil, servis içinde tutulur.
 */
const projectBaseSchema = z.object({
  customerId: z.string().uuid("Geçersiz müşteri."),

  /** Boş seçilirse proje müşteri genelindedir. */
  customerSiteId: z.string().uuid("Geçersiz site.").optional().or(z.literal("")),

  code: z
    .string()
    .trim()
    .min(1, "Proje kodu zorunludur.")
    .max(64, "Proje kodu en fazla 64 karakter olabilir."),

  name: z
    .string()
    .trim()
    .min(1, "Proje adı zorunludur.")
    .max(200, "Proje adı en fazla 200 karakter olabilir."),

  /** Müşterinin kendi proje kodu; mQDMS koduyla bağımsızdır. */
  customerProjectCode: optionalText(64),

  description: optionalText(2000),

  status: projectStatusSchema,

  /** Proje müdürü olan organizasyon üyesi. */
  projectManagerMemberId: z.string().trim().optional().or(z.literal("")),

  startDate: optionalDate,
  targetCompletionDate: optionalDate,
  actualCompletionDate: optionalDate,
});

/** Proje güncelleme formu. */
export const projectFormSchema = projectBaseSchema;

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/**
 * Proje oluşturma formu.
 *
 * Oluşturma sırasında bir tesis seçilebilir: `ACTIVE` durumundaki bir proje
 * için en az bir tesis gerekir.
 */
export const projectCreateSchema = projectBaseSchema.extend({
  primaryPlantId: z.string().uuid("Geçersiz tesis.").optional().or(z.literal("")),
});

export type ProjectCreateValues = z.infer<typeof projectCreateSchema>;

/** Proje ekibine üye ekleme formu. */
export const projectMemberFormSchema = z.object({
  memberId: z.string().trim().min(1, "Üye seçilmedi."),

  projectRole: projectRoleSchema,

  responsibility: optionalText(500),
});

export type ProjectMemberFormValues = z.infer<typeof projectMemberFormSchema>;

/** Projeye tesis atama formu. */
export const projectPlantFormSchema = z.object({
  plantId: z.string().uuid("Geçersiz tesis."),

  isPrimary: z.boolean().optional(),
});

export type ProjectPlantFormValues = z.infer<typeof projectPlantFormSchema>;
