import { redirect } from "next/navigation";

/**
 * Eski ayarlar rotası.
 *
 * Canonical adresler `/organization/*` altındadır; eski adresler geri
 * yönlendirme ile korunur.
 */
export default function Page() {
  redirect("/organization");
}
