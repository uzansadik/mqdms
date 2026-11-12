import { z } from "zod";

/**
 * İstemci tarafı ortam değişkenleri.
 *
 * Bu modül client bundle'a girdiği için yalnızca `NEXT_PUBLIC_*` önekli,
 * gizli olmayan değerleri içerir.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().min(1, "NEXT_PUBLIC_APP_URL is required and must be a valid URL"),

  NEXT_PUBLIC_AUTH_URL: z
    .url()
    .min(1, "NEXT_PUBLIC_AUTH_URL is required and must be a valid URL"),

  /**
   * İş uygulamasının adresi (`app.mqdms.com`).
   *
   * Auth deploy'undan iş uygulamasına, iş uygulamasından auth'a bağlantı
   * verilirken kullanılır.
   */
  NEXT_PUBLIC_BUSINESS_APP_URL: z
    .url()
    .min(1, "NEXT_PUBLIC_BUSINESS_APP_URL is required and must be a valid URL"),
});

export const env = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_BUSINESS_APP_URL: process.env.NEXT_PUBLIC_BUSINESS_APP_URL,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
