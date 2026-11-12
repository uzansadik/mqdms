import { z } from "zod";

/**
 * Çekirdek sunucu ortamı.
 *
 * Yalnızca herkesin ihtiyaç duyduğu değişkenler burada yer alır: veritabanı
 * bağlantısı ve çalışma ortamı. Auth, depolama, e-posta ve Redis değişkenleri
 * ayrı modüllerde tanımlıdır; böylece `migrate` ve `worker` container'ları
 * ihtiyaç duymadıkları secret'ları talep etmez.
 */
const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "staging", "production", "test"]).default("local"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .meta({ description: "The database connection URL" }),
});

export const env = serverEnvSchema.parse({
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
