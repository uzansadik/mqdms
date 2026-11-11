"use server";

import { getMemberships } from "@mqdms/auth/permissions/publish";
import { auth } from "@mqdms/auth/server";
import { cookies, headers } from "next/headers";
import { getFreshSession } from "@/features/auth/session";

import { OAUTH_ORGANIZATION_COOKIE } from "./query";
import { createOAuthClientSchema, splitLines } from "./schemas";
import { oauthResourceExists } from "./server";

type CreateOAuthClientResult =
  | { success: true; data: { clientId: string; clientSecret?: string } }
  | { success: false; error: string };

type DeleteOAuthClientResult = { success: true } | { success: false; error: string };

type RememberOrganizationResult = { success: true } | { success: false };

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Yeni tüketen uygulama (OAuth client) kaydeder.
 *
 * Client secret yalnızca bu yanıtta bir kez gösterilir; sonrasında hash'li
 * olarak saklanır.
 */
export async function createOAuthClientAction(input: unknown): Promise<CreateOAuthClientResult> {
  const parsed = createOAuthClientSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid form data" };
  }

  const session = await getFreshSession();

  if (session?.user.role !== "superadmin") {
    return { success: false, error: "Forbidden" };
  }

  const redirectUris = splitLines(parsed.data.redirectUris);
  const invalidRedirectUri = redirectUris.find((uri) => !isValidUrl(uri));

  if (invalidRedirectUri) {
    return { success: false, error: `Invalid redirect URI: ${invalidRedirectUri}` };
  }

  const resources = splitLines(parsed.data.resources ?? "");
  const invalidResource = resources.find((uri) => !isValidUrl(uri));

  if (invalidResource) {
    return { success: false, error: `Invalid resource: ${invalidResource}` };
  }

  try {
    const requestHeaders = await headers();

    /*
     * Resource'lar (korunan API'ler) client'a bağlanmadan önce tanımlı
     * olmalıdır; yoksa burada oluşturulur.
     */
    for (const identifier of resources) {
      if (await oauthResourceExists(identifier)) {
        continue;
      }

      await auth.api.adminCreateOAuthResource({
        headers: requestHeaders,
        body: {
          identifier,
          name: identifier,
        },
      });
    }

    const client = await auth.api.adminCreateOAuthClient({
      headers: requestHeaders,
      body: {
        client_name: parsed.data.clientName,
        redirect_uris: redirectUris,
        /*
         * `offline_access` scope'u isteyen client'lar refresh token alabilsin:
         * refresh token üretimi `refresh_token` grant'ına bağlıdır ve grant
         * verilmezse plugin yalnızca `authorization_code` kaydeder.
         */
        grant_types: ["authorization_code", "refresh_token"],
        ...(resources.length > 0 ? { resources } : {}),
        ...(parsed.data.scope ? { scope: parsed.data.scope } : {}),
        ...(parsed.data.publicClient ? { token_endpoint_auth_method: "none" } : {}),
      },
    });

    return {
      success: true,
      data: {
        clientId: client.client_id,
        clientSecret: client.client_secret,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The application could not be created.";

    return { success: false, error: message };
  }
}

/** Kayıtlı tüketen uygulamayı siler. */
export async function deleteOAuthClientAction(clientId: string): Promise<DeleteOAuthClientResult> {
  const session = await getFreshSession();

  if (session?.user.role !== "superadmin") {
    return { success: false, error: "Forbidden" };
  }

  if (!clientId) {
    return { success: false, error: "Invalid client" };
  }

  try {
    await auth.api.deleteOAuthClient({
      headers: await headers(),
      body: { client_id: clientId },
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The application could not be deleted.";

    return { success: false, error: message };
  }
}

/**
 * Yetkilendirme akışında seçilen organizasyonu akışa bağlı olarak hatırlar.
 *
 * Oturumun aktif organizasyonu tüm sekmelerde paylaşılır; başka bir sekmede
 * organizasyon değiştirilirse onay ekranı yanlış organizasyonu gösterip
 * onaylayabilirdi. Bu cookie seçimi akışın kendisine bağlar.
 */
export async function rememberOAuthOrganizationAction(
  organizationId: string,
): Promise<RememberOrganizationResult> {
  const session = await getFreshSession();

  if (!session) {
    return { success: false };
  }

  const memberships = await getMemberships(session.user.id);
  const isMember = memberships.some((membership) => membership.organizationId === organizationId);

  if (!isMember) {
    return { success: false };
  }

  const cookieStore = await cookies();

  cookieStore.set(OAUTH_ORGANIZATION_COOKIE, organizationId, {
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return { success: true };
}
