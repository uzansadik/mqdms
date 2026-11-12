import { redirect } from "next/navigation";

/**
 * Eski onboarding rotası.
 *
 * Organizasyon artık yalnızca `/bootstrap-org` ekranından açılır; üye olmayan
 * kullanıcılar `/no-access` ekranına yönlendirilir.
 */
export default function Page() {
  redirect("/no-access");
}
