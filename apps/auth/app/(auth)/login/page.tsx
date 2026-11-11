import { LoginForm } from "@/features/auth/login-form";
import { redirectIfAuthenticated } from "@/features/auth/session";
import { getSafeNextPath } from "@/features/auth/utils";
import { isOAuthAuthorizationRequest } from "@/features/oauth/query";

type PageProps = {
  searchParams: Promise<{
    next?: string;
    sig?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  /*
   * OAuth akışında (adres çubuğunda imzalı authorize parametreleri var)
   * kullanıcı zaten giriş yapmış olabilir; `/dashboard`'a yönlendirme
   * akışı keserdi, bu yüzden atlanır.
   */
  const isOAuthFlow = isOAuthAuthorizationRequest(params);

  if (!isOAuthFlow) {
    await redirectIfAuthenticated();
  }

  return <LoginForm next={getSafeNextPath(params.next)} isOAuthFlow={isOAuthFlow} />;
}
