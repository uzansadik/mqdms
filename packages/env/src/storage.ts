import { z } from "zod";

// `.env` dosyasında değişken tanımlı ama boş bırakılmış olabilir
// (`STORAGE_ENDPOINT=`). `optional()` yalnızca "anahtar hiç yok" durumunu
// kabul eder; boş string URL doğrulamasını geçmez. Boş string'leri
// `undefined`'a çeviriyoruz.
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());

const storageEnvSchema = z.object({
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_PUBLIC_URL: optionalUrl,
});

export const storageEnv = storageEnvSchema.parse({
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  STORAGE_REGION: process.env.STORAGE_REGION,
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,
});

export type StorageEnv = z.infer<typeof storageEnvSchema>;
