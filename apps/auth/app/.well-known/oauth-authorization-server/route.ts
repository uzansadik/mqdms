import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@mqdms/auth/server";

export const runtime = "nodejs";

/**
 * OAuth 2.1 authorization server metadata'si.
 *
 * Tüketen uygulamalar yetkilendirme sunucusunu keşfetmek için bu adresi
 * kullanır. Plugin bu handler'ı sağlamaz; uç elle mount edilir.
 */
export const GET = oauthProviderAuthServerMetadata(auth);
