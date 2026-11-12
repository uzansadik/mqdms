/*
 * Genel kayıt rotası kaldırıldı.
 *
 * Hesaplar artık yalnızca iki kaynaktan oluşur:
 *
 * 1. İlk kurulum — `/bootstrap-org` (`features/bootstrap/service.ts`).
 * 2. Davet bağlantısı — `/accept-invitation` (`features/organization/
 *    invitation-registration.ts`).
 *
 * better-auth'in `/sign-up/email` endpoint'i de kapalıdır
 * (`packages/auth/src/server.ts` → `disableSignUp: true`), bu yüzden formu
 * gizlemek tek başına yeterli olmazdı. Bu rota bilerek 404 döner.
 */
import { notFound } from "next/navigation";

export default function Page() {
  notFound();
}
