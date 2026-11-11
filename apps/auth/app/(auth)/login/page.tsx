import { LoginForm } from "@/features/auth/login-form";
import { redirectIfAuthenticated } from "@/features/auth/session";
import { getSafeNextPath } from "@/features/auth/utils";
import {
  buildAuthorizationUrl,
  isOAuthAuthorizationRequest,
  toSearchParams,
} from "@/features/oauth/query";

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

  /*
   * OAuth akışında "nereye döneceğimiz" bilgisi authorize isteğinin kendisidir:
   * e-posta doğrulaması gerektiğinde kullanıcı doğrulamadan sonra bu adrese
   * geri döner ve akış kaldığı yerden devam eder.
   */
  const next = isOAuthFlow
    ? buildAuthorizationUrl("/api/auth/oauth2/authorize", toSearchParams(params))
    : getSafeNextPath(params.next);

  return <LoginForm isOAuthFlow={isOAuthFlow} next={next} />;
}
