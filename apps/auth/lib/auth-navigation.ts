import { env } from "@mqdms/env/client";

/**
 * Yönlendirme güvenliği.
 *
 * `returnTo` değeri kullanıcıdan gelir (sorgu dizesi). Açık yönlendirme
 * (open redirect) ve cross-origin sıçramayı engellemek için yalnızca:
 *
 * - Uygulamanın kendi kök dizinine (`/...`) giden relative path'ler,
 * - İzin verilen origin listesindeki mutlak adresler,
 *
 * kabul edilir. URL credentials, protocol-relative (`//evil.com`), ters
 * eğik çizgi, yanlış şema ve kodlanmış kaçış denemeleri reddedilir.
 */

/** İzin verilen origin'ler (auth ve app deploy'ları). */
export const allowedReturnOrigins: string[] = [
  originOf(env.NEXT_PUBLIC_AUTH_URL),
  originOf(env.NEXT_PUBLIC_APP_URL),
].filter((origin): origin is string => Boolean(origin));

/** Kontrol karakterleri yönlendirme hedeflerinde kabul edilmez. */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }

  return false;
}

export type SafeReturnOptions = {
  /** Mutlak adresler için izin verilen origin listesi. */
  allowedOrigins?: readonly string[];

  /** Geçersiz değerlerde kullanılacak yedek yol. */
  fallback?: string;
};

/**
 * `returnTo` değerini güvenli bir hedefe indirger.
 *
 * Güvenli değilse `fallback` döner.
 */
export function getSafeReturnTo(
  value: string | null | undefined,
  options: SafeReturnOptions = {},
): string {
  const fallback = options.fallback ?? "/dashboard";

  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  /*
   * Çift kodlama: decode sonrası hâlâ yüzde varsa içerik gizlenmiş olabilir.
   * Böyle bir değer kabul edilmez.
   */
  if (decoded.includes("%")) {
    return fallback;
  }

  if (hasControlCharacters(decoded) || decoded.includes("\\")) {
    return fallback;
  }

  /* Relative path: uygulamanın kendi kök dizini. */
  if (decoded.startsWith("/")) {
    /* Protocol-relative adres (`//evil.com`) harici origin'dir. */
    if (decoded.startsWith("//")) {
      return fallback;
    }

    return decoded;
  }

  /* Mutlak adres: origin izin listesinde olmalı. */
  let url: URL;

  try {
    url = new URL(decoded);
  } catch {
    return fallback;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fallback;
  }

  /* URL içinde kimlik bilgisi (user:pass@) kabul edilmez. */
  if (url.username || url.password) {
    return fallback;
  }

  const allowed = options.allowedOrigins ?? allowedReturnOrigins;

  if (!allowed.includes(url.origin)) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Adresi yalnızca origin biçimine indirger. */
function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Adres çubuğundaki `returnTo` değerini güvenli biçime indirger. */
export function getSafeNext(fallback = "/dashboard"): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  const next = new URLSearchParams(window.location.search).get("returnTo");

  return getSafeReturnTo(next, { fallback });
}

export function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

export function withReturnTo(path: string, returnTo: string): string {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
