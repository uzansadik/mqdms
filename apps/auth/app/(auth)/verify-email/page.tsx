// app/(auth)/verify-email/page.tsx

import { redirectIfAuthenticated } from "@/features/auth/session";
import { getSafeNextPath } from "@/features/auth/utils";
import { VerificationForm } from "@/features/auth/verification-form";

type PageProps = {
  searchParams: Promise<{
    email?: string;
    next?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  await redirectIfAuthenticated();

  return <VerificationForm email={params.email ?? ""} next={getSafeNextPath(params.next)} />;
}
