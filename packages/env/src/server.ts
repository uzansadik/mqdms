import { z } from "zod";

// `.env` dosyasında değişken tanımlı ama boş bırakılmış olabilir
// (`STORAGE_ENDPOINT=`). `optional()` yalnızca "anahtar hiç yok" durumunu
// kabul eder; boş string URL doğrulamasını geçmez. Boş string'leri
// `undefined`'a çeviriyoruz.
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());

// Boş bırakılmış bootstrap anahtarı "tanımsız" sayılır (aksi halde uygulama
// başlarken doğrulama hatası verir).
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(32).optional(),
);

// `.env` dosyasında değişken `"true"` / `"false"` metni olarak tutulur.
// `1` / `0` ve büyük/küçük harf varyantları da kabul edilir.
const envBoolean = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return value;
}, z.boolean());

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "staging", "production", "test"]).default("local"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .meta({ description: "The database connection URL" }),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email().min(1, "RESEND_FROM_EMAIL is required"),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_PUBLIC_URL: optionalUrl,
  NEXT_PUBLIC_APP_URL: z.url().min(1, "NEXT_PUBLIC_APP_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  SUPERADMIN_BOOTSTRAP_ENABLED: envBoolean.default(true),
  SUPERADMIN_BOOTSTRAP_KEY: optionalSecret,
});

export const env = serverEnvSchema.parse({
  APP_ENV: process.env.APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  STORAGE_REGION: process.env.STORAGE_REGION,
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  REDIS_URL: process.env.REDIS_URL,
  SUPERADMIN_BOOTSTRAP_ENABLED: process.env.SUPERADMIN_BOOTSTRAP_ENABLED,
  SUPERADMIN_BOOTSTRAP_KEY: process.env.SUPERADMIN_BOOTSTRAP_KEY,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
