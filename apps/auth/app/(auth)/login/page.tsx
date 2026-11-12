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

  const returnTo = getSafeReturnTo(params.returnTo);

  await redirectIfAuthenticated(returnTo);

  return <LoginForm returnTo={returnTo} />;
}
