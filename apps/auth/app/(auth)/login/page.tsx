// app/(auth)/login/page.tsx

import { LoginForm } from "@/features/auth/login-form";
import { getSafeNextPath } from "@/features/auth/utils";

type PageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  return <LoginForm next={getSafeNextPath(params.next)} />;
}
