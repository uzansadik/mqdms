// app/(auth)/reset-password/page.tsx

import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/reset-password-form";

type PageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>

        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>

        <Link className="text-sm underline" href="/forgot-password">
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
