import { type NextRequest, NextResponse } from "next/server";

/**
 * Oturum cookie adları.
 *
 * Better Auth cookie adını `cookiePrefix` ile oluşturur (`mqdms.session_token`).
 * Üretimde `useSecureCookies` açık olduğu için başına `__Secure-` ön eki
 * gelir; her iki ad da kontrol edilir.
 */
const SESSION_COOKIE_NAMES = ["mqdms.session_token", "__Secure-mqdms.session_token"];

/**
 * İyimser oturum kontrolü.
 *
 * Bu bir *erken* yönlendirmedir, tam yetkilendirme değildir: cookie yoksa
 * giriş ekranına gidilir. Oturumun gerçekten geçerli olduğu ve organizasyon
 * üyeliğinin doğru olduğu sayfa düzeyinde veritabanından doğrulanır.
 *
 * `returnTo` korunur: kullanıcı girişten sonra kaldığı sayfaya döner.
 */
export function proxy(request: NextRequest) {
  /*
   * Açılış sayfası herkese açıktır; giriş ekranına yönlendirilmez.
   */
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);

  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  /*
   * Statik dosyalar ve Next.js iç varlıkları koruma kontrolünden geçmez.
   * `api` Better Auth handler'ıdır ve kesinlikle yönlendirilmemelidir.
   * Giriş, bootstrap ve davet ekranları zaten oturum gerektirmez.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|login|bootstrap-org|accept-invitation|forgot-password|reset-password|verify-email|faq).*)",
  ],
};
