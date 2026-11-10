/*
 * Genel kayıt rotası kaldırıldı.
 *
 * Hesaplar artık yalnızca iki kaynaktan oluşur:
 *
 * 1. Davet bağlantısı — `/accept-invitation` (`features/organization/
 *    invitation-registration.ts`).
 * 2. Superadmin — `/bootstrap-superadmin` ve admin paneli.
 *
 * better-auth'in `/sign-up/email` endpoint'i de kapalıdır
 * (`packages/auth/src/server.ts` → `disableSignUp: true`), bu yüzden formu
 * gizlemek tek başına yeterli olmazdı. Bu rota bilerek 404 döner.
 */
import { notFound } from "next/navigation";

export default function Page() {
  notFound();
}
