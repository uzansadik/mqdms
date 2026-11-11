// app/(auth)/forgot-password/page.tsx

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/features/auth/session";

export default async function Page() {
  await redirectIfAuthenticated();

  return <ForgotPasswordForm />;
}
