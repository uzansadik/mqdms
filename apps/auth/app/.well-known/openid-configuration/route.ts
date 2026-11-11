import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@mqdms/auth/server";

export const runtime = "nodejs";

/**
 * OpenID Connect discovery metadata'sı.
 *
 * `openid` scope'unu isteyen tüketen uygulamalar bu adresi kullanır.
 */
export const GET = oauthProviderOpenIdConfigMetadata(auth);
