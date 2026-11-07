// app/(auth)/register/page.tsx

import { RegisterForm } from "@/features/auth/register-form";
import { getSafeNextPath } from "@/features/auth/utils";

type PageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  return <RegisterForm next={getSafeNextPath(params.next)} />;
}
