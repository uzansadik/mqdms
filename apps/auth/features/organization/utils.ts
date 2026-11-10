export function createSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Yazarken uygulanan seyrek normalizasyon.
 *
 * `createSlug` baştaki ve sondaki tireleri siler; her tuş vuruşunda
 * çağrıldığında kullanıcı "acme-" yazarken "acme"e geri dönüyordu.
 * Burada yalnızca geçersiz karakterler tireye çevrilir, tireler korunur.
 * Tam normalizasyon `createSlug` ile alan `onBlur`unda yapılır.
 */
export function sanitizeSlugInput(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-");
}
