import { apiKeyClient } from "@better-auth/api-key/client";
import { env } from "@mqdms/env/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "./permissions/statements";

/**
 * Tarayıcı istemcisi.
 *
 * `baseURL` **her zaman** auth deploy'unun adresidir (`auth.mqdms.com`):
 * oturum cookie'si orada yazılır ve iki subdomain bu cookie'yi paylaşır.
 * Uygulamanın kendi adresi `NEXT_PUBLIC_APP_URL` ile ayrı tutulur.
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_AUTH_URL,
  plugins: [
    organizationClient({
      ac,
      roles,
    }),
    apiKeyClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;
