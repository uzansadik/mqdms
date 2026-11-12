import { z } from "zod";

/**
 * Uygulama (public) ortamı.
 *
 * `NEXT_PUBLIC_APP_URL` her deploy'un **kendi** origin'idir:
 * `auth.mqdms.com` için `https://auth.mqdms.com`, `app.mqdms.com` için
 * `https://app.mqdms.com`.
 *
 * `NEXT_PUBLIC_AUTH_URL` ise her iki deploy'ta **aynı** olmalıdır: oturum
 * cookie'si ve auth yönlendirmeleri bu adrese gider.
 */
const appEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().min(1, "NEXT_PUBLIC_APP_URL is required and must be a valid URL"),

  NEXT_PUBLIC_AUTH_URL: z
    .url()
    .min(1, "NEXT_PUBLIC_AUTH_URL is required and must be a valid URL"),

  NEXT_PUBLIC_BUSINESS_APP_URL: z
    .url()
    .min(1, "NEXT_PUBLIC_BUSINESS_APP_URL is required and must be a valid URL"),
});

export const appEnv = appEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_BUSINESS_APP_URL: process.env.NEXT_PUBLIC_BUSINESS_APP_URL,
});

export type AppEnv = z.infer<typeof appEnvSchema>;
