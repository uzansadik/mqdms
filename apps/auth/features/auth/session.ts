import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function redirectIfAuthenticated(redirectTo = "/dashboard") {
  const session = await getSession();

  if (session) {
    redirect(redirectTo);
  }
}
