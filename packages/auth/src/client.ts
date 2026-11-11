import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
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
    /*
     * OAuth provider akışı: sayfanın adres çubuğundaki imzalı sorguyu her
     * POST isteğine ekler. Böylece giriş, onay ve akışa devam istekleri
     * authorize isteğinin imzalı parametrelerini taşır.
     */
    oauthProviderClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;
