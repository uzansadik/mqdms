import type { OAuthOptions, Scope } from "@better-auth/oauth-provider";
import { env } from "@mqdms/env/server";

import {
  getMemberships,
  getPublishedAuthorization,
  resolveAuthorizationOrganization,
} from "./permissions/publish";

/**
 * Merkezi kimlik yöneticisi (OAuth provider) ayarları.
 *
 * Tüketen uygulamalar `https://auth.mqdms.com/api/auth/oauth2/authorize`
 * adresine yönlendirilir; kullanıcı giriş yapar, organizasyonunu seçer,
 * onay verir ve uygulama `code` ile geri döner. Token'lar bu modülün
 * ürettiği claim'lerle yetki bilgisini taşır.
 */

/** Claim adları RFC 9068 gereği URI ile adlandırılır. */
const CLAIM_NAMESPACE = "https://auth.mqdms.com";

export const OAUTH_ORGANIZATION_CLAIM = `${CLAIM_NAMESPACE}/organization`;
export const OAUTH_ROLES_CLAIM = `${CLAIM_NAMESPACE}/roles`;
export const OAUTH_PERMISSIONS_CLAIM = `${CLAIM_NAMESPACE}/permissions`;
export const OAUTH_PLATFORM_ROLE_CLAIM = `${CLAIM_NAMESPACE}/platform-role`;

/** İzin ve rol claim'lerini okumak için gereken scope. */
export const OAUTH_PERMISSIONS_SCOPE = "permissions:read";

/** Provider'ın desteklediği scope listesi. */
export const OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  OAUTH_PERMISSIONS_SCOPE,
] as const;

/**
 * better-auth'in güvenilir origin listesi.
 *
 * `callbackURL` ve `redirectTo` alanları bu listeye göre doğrulanır; listede
 * olmayan bir origin'e yönlendirme reddedilir.
 */
export function getTrustedOrigins(): string[] {
  const raw = env.OAUTH_TRUSTED_ORIGINS;

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Oturumdaki aktif organizasyon id'si. */
export function getActiveOrganizationId(session: unknown): string | undefined {
  if (!session || typeof session !== "object") {
    return undefined;
  }

  const value = (session as { activeOrganizationId?: unknown }).activeOrganizationId;

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Kullanıcının platform rolü (`user` / `superadmin`). */
function getPlatformRole(user: unknown): string {
  if (!user || typeof user !== "object") {
    return "user";
  }

  const role = (user as { role?: unknown }).role;

  return typeof role === "string" && role.length > 0 ? role : "user";
}

/**
 * OAuth provider plugin ayarları.
 *
 * `postLogin` adımı, kullanıcının birden fazla organizasyonu varsa
 * organizasyon seçim ekranına yönlendirir; seçilen organizasyon
 * `consentReferenceId` üzerinden token'a `referenceId` olarak geçer ve
 * claim'lerdeki organizasyon bağlamını belirler.
 */
export const oauthProviderOptions: OAuthOptions<Scope[]> = {
  loginPage: "/login",
  consentPage: "/oauth/consent",

  scopes: [...OAUTH_SCOPES],

  postLogin: {
    page: "/oauth/organizations",

    shouldRedirect: async ({ user, session, isContinuation }) => {
      const memberships = await getMemberships(user.id);

      if (memberships.length === 0) {
        /*
         * Platform superadmin'in hiçbir organizasyona üyeliği olmayabilir;
         * bu durumda organizasyon adımı atlanır ve yalnızca platform rolü
         * yayınlanır. Diğer kullanıcılar için akış "erişim yok" ekranında
         * durur.
         */
        return getPlatformRole(user) !== "superadmin";
      }

      const resolved = resolveAuthorizationOrganization({
        memberships,
        organizationId: getActiveOrganizationId(session),
      });

      if (resolved) {
        return false;
      }

      /*
       * Kullanıcı seçim ekranından döndü ama geçerli bir organizasyon seçmemiş
       * (ya da seçtiği organizasyonda üyeliği yok): tekrar sorulur.
       */
      if (isContinuation) {
        return true;
      }

      // Tek üyelik varsa sorulmaz; `consentReferenceId` tek üyeliği kullanır.
      return memberships.length > 1;
    },

    consentReferenceId: async ({ user, session }) => {
      const memberships = await getMemberships(user.id);

      /*
       * Oturumdaki aktif organizasyon yalnızca kullanıcının hâlâ üyesi
       * olduğu organizasyon ise kullanılır. Üyelik sona ermiş bir
       * organizasyon yayınlanırsa token yanlış organizasyonu gösterir.
       */
      return resolveAuthorizationOrganization({
        memberships,
        organizationId: getActiveOrganizationId(session),
      });
    },
  },

  /**
   * Token claim'leri.
   *
   * Organizasyon ve platform rolü her zaman yayınlanır; rol ve izin listesi
   * yalnızca client `permissions:read` scope'unu istediğinde eklenir.
   */
  customAccessTokenClaims: async ({ user, referenceId, scopes }) => {
    const claims: Record<string, unknown> = {};

    if (!user) {
      return claims;
    }

    claims[OAUTH_PLATFORM_ROLE_CLAIM] = getPlatformRole(user);

    if (!referenceId) {
      return claims;
    }

    claims[OAUTH_ORGANIZATION_CLAIM] = referenceId;

    if (!scopes.includes(OAUTH_PERMISSIONS_SCOPE)) {
      return claims;
    }

    const published = await getPublishedAuthorization({
      userId: user.id,
      organizationId: referenceId,
    });

    if (!published) {
      return claims;
    }

    claims[OAUTH_ROLES_CLAIM] = published.roles;
    claims[OAUTH_PERMISSIONS_CLAIM] = published.permissions;

    return claims;
  },

  /** UserInfo yanıtı, access token payload'ındaki claim'leri tekrarlar. */
  customUserInfoClaims: async ({ jwt }) => {
    const claims: Record<string, unknown> = {};

    for (const claim of [
      OAUTH_ORGANIZATION_CLAIM,
      OAUTH_ROLES_CLAIM,
      OAUTH_PERMISSIONS_CLAIM,
      OAUTH_PLATFORM_ROLE_CLAIM,
    ]) {
      if (jwt[claim] !== undefined) {
        claims[claim] = jwt[claim];
      }
    }

    return claims;
  },

  /** Client yönetimi yalnızca platform superadmin'ine açık. */
  clientPrivileges: async ({ user }) => {
    return getPlatformRole(user) === "superadmin";
  },

  /*
   * Tüm client kayıtları platforma aittir.
   *
   * Bu değer tanımlanmazsa plugin client'ı kaydeden kullanıcıya bağlar ve
   * başka bir superadmin client'ı silemez (client.userId eşleşmesi zorunlu
   * olur). Platform referansıyla her superadmin tüm client'ları yönetebilir.
   */
  clientReference: async () => "platform",

  /** Resource (korunan API) yönetimi de yalnızca superadmin'ine açık. */
  resourcePrivileges: async ({ user }) => {
    return getPlatformRole(user) === "superadmin";
  },

  ...(env.OAUTH_PAIRWISE_SECRET ? { pairwiseSecret: env.OAUTH_PAIRWISE_SECRET } : {}),
};
