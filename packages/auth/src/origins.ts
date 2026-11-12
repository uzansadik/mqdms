import { authEnv } from "@mqdms/env/auth";

/**
 * better-auth'in güvenilir origin listesi.
 *
 * `callbackURL` ve `redirectTo` alanları bu listeye göre doğrulanır; listede
 * olmayan bir origin'e yönlendirme `INVALID_CALLBACK_URL` ile reddedilir.
 *
 * Liste **kesin** bir origin listesidir: wildcard kullanılmaz. `BETTER_AUTH_URL`
 * her zaman listeye eklenir, böylece auth deploy'unun kendi adresi de
 * güvenilir kalır.
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  const authOrigin = originOf(authEnv.BETTER_AUTH_URL);

  if (authOrigin) {
    origins.add(authOrigin);
  }

  for (const origin of parseOriginList(authEnv.AUTH_TRUSTED_ORIGINS)) {
    origins.add(origin);
  }

  return [...origins];
}

/**
 * Virgülle ayrılmış origin listesini ayrıştırır.
 *
 * Boş ve geçersiz girdiler yok sayılır; wildcard içeren origin'ler kabul
 * edilmez (güvenilir origin listesi kesin olmalıdır).
 */
export function parseOriginList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const origins: string[] = [];

  for (const candidate of raw.split(",")) {
    const trimmed = candidate.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.includes("*")) {
      continue;
    }

    const normalized = originOf(trimmed);

    if (normalized) {
      origins.push(normalized);
    }
  }

  return origins;
}

/**
 * Bir adresi yalnızca origin biçimine indirger.
 *
 * `https://app.mqdms.com/fmea/123` -> `https://app.mqdms.com`
 *
 * Geçersiz bir adres için `null` döner.
 */
export function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
