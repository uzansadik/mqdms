import { env } from "@mqdms/env/client";
import { LoginForm } from "@/features/auth/login-form";
import { redirectIfAuthenticated } from "@/features/auth/session";
import { getSafeReturnTo } from "@/lib/auth-navigation";

type PageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  /*
   * Geri dönüş adresi verilmemişse kullanıcı **iş uygulamasına** yönlendirilir:
   * auth uygulaması giriş noktasıdır, çalışma alanı değildir.
   */
  const returnTo = getSafeReturnTo(params.returnTo, {
    fallback: env.NEXT_PUBLIC_BUSINESS_APP_URL,
  });

  await redirectIfAuthenticated(returnTo);

  return <LoginForm returnTo={returnTo} />;
}
