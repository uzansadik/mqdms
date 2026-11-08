import { apiKeyClient } from "@better-auth/api-key/client";
import { env } from "@mqdms/env/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { platformAc, platformRoles } from "./permissions/platform";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [
    adminClient({
      ac: platformAc,
      roles: platformRoles,
    }),
    organizationClient(),
    apiKeyClient(),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;
