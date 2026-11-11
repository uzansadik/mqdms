/**
 * OAuth provider akışının sayfa üzerindeki izleri.
 *
 * better-auth'ın OAuth provider plugin'i, kullanıcıyı giriş (veya onay)
 * ekranına yönlendirirken authorize isteğinin parametrelerini imzalayarak
 * sayfanın adres çubuğuna ekler. İmza `sig` parametresindedir.
 *
 * Bu ayrım iki yerde önemlidir:
 *
 * 1. Giriş ekranı, kullanıcı zaten giriş yapmışsa `/dashboard`'a yönlendirir.
 *    OAuth akışında bu yönlendirme akışı keser; bu yüzden `sig` varsa
 *    yönlendirme yapılmaz.
 * 2. İstemci plugin'i, sayfanın adres çubuğundaki imzalı parametreleri her
 *    POST isteğine ekler; böylece giriş isteği authorize bağlamını taşır.
 */

/** Sayfa adresinde OAuth authorize isteğinin imzalı parametreleri var mı? */
export function isOAuthAuthorizationRequest(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const signature = params.sig;

  return typeof signature === "string" && signature.length > 0;
}

/** Next.js `searchParams` nesnesini `URLSearchParams`'a çevirir. */
export function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
    } else if (value !== undefined) {
      searchParams.append(key, value);
    }
  }

  return searchParams;
}

/**
 * Adres çubuğundaki imzalı parametreleri ayıklar.
 *
 * Plugin, imzaya dahil edilen parametre adlarını `ba_param` listesinde
 * tutar. İstemci de aynı ayıklamayı yapar; sunucu tarafında da aynı kural
 * uygulanmalıdır, aksi halde imza doğrulaması yanlış parametre kümesiyle
 * yapılır.
 */
export function buildSignedQuery(searchParams: URLSearchParams): string {
  const signedNames = new Set(searchParams.getAll("ba_param"));

  if (signedNames.size === 0) {
    return "";
  }

  const signed = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (key === "sig" || key === "ba_param" || signedNames.has(key)) {
      signed.append(key, value);
    }
  }

  return signed.toString();
}

/** İlk değeri döndürür (tekrar eden parametrelerde ilki kullanılır). */
export function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
