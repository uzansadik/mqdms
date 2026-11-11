"use server";

import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { getFreshSession } from "@/features/auth/session";

import { createOAuthClientSchema, splitLines } from "./schemas";
import { oauthResourceExists } from "./server";

type CreateOAuthClientResult =
  | { success: true; data: { clientId: string; clientSecret?: string } }
  | { success: false; error: string };

type DeleteOAuthClientResult = { success: true } | { success: false; error: string };

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
