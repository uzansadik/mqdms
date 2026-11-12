import { z } from "zod";

/**
 * Boş bırakılmış bir secret "tanımsız" sayılır.
 *
 * `.env` dosyasında değişken tanımlı ama boş bırakılmış olabilir; bu durumda
 * uygulama başlarken doğrulama hatası vermek yerine değişken yok sayılır.
 */
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

/**
 * `.env` dosyasında değişken `"true"` / `"false"` metni olarak tutulur.
 * `1` / `0` ve büyük/küçük harf varyantları da kabul edilir.
 */
const envBoolean = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "") {
    return false;
  }

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return value;
}, z.boolean());

/**
 * Kimlik doğrulama (Better Auth) ortamı.
 *
 * `BETTER_AUTH_URL` her iki web deploy'ta **aynı** olmalıdır: oturum cookie'si
 * `auth.mqdms.com` üzerinde yazılır ve `app.mqdms.com` aynı cookie'yi okur.
 *
 * `AUTH_TRUSTED_ORIGINS` better-auth'in `callbackURL` / `redirectTo`
 * doğrulamasında kullandığı kesin origin listesi. Wildcard kullanılmaz.
 *
 * `AUTH_COOKIE_DOMAIN` cookie'nin yazılacağı paylaşımlı alan adı
 * (ör. `.mqdms.com`). Yerelde boş bırakılırsa cookie host'a özel yazılır.
 */
const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),

  BETTER_AUTH_URL: z.url(),

  AUTH_TRUSTED_ORIGINS: optionalSecret,

  AUTH_COOKIE_DOMAIN: optionalSecret,

  /*
   * Organizasyon bootstrap'u varsayılan olarak kapalıdır; açıkça
   * etkinleştirilmedikçe kapalı kalır. Değişken tanımsız olduğunda `true`ya
   * düşmek, üretimde ilk kurulumu herkesin yapabileceği bir pencere açardı.
   */
  ORG_BOOTSTRAP_ENABLED: envBoolean.default(false),

  ORG_BOOTSTRAP_KEY: optionalSecret,
});

export const authEnv = authEnvSchema.parse({
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  ORG_BOOTSTRAP_ENABLED: process.env.ORG_BOOTSTRAP_ENABLED,
  ORG_BOOTSTRAP_KEY: process.env.ORG_BOOTSTRAP_KEY,
});

export type AuthEnv = z.infer<typeof authEnvSchema>;
