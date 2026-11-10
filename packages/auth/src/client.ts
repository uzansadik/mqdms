import { apiKeyClient } from "@better-auth/api-key/client";
import { env } from "@mqdms/env/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { platformAc, platformRoles } from "./permissions/platform";
import { ac, roles } from "./permissions/statements";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [
    adminClient({
      ac: platformAc,
      roles: platformRoles,
    }),
    organizationClient({
      ac,
      roles,
    }),
    apiKeyClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;
