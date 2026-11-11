import { db } from "@mqdms/db";
import { oauthClient, oauthClientResource, oauthResource, organization } from "@mqdms/db/schema";
import { desc, eq } from "drizzle-orm";

export type OAuthClientSummary = {
  clientId: string;
  name: string | null;
  redirectUris: string[];
  scopes: string[] | null;
  tokenEndpointAuthMethod: string | null;
  disabled: boolean | null;
  createdAt: Date | null;
  resources: string[];
};

export type OAuthResourceSummary = {
  identifier: string;
  name: string;
  accessTokenTtl: number | null;
  allowedScopes: string[] | null;
};

/**
 * Kayıtlı tüketen uygulamalar (OAuth client'ları).
 *
 * Plugin'in liste endpoint'i yalnızca oturum sahibinin client'larını
 * döndürür; panel tüm kayıtları gösterdiği için doğrudan veritabanı okunur.
 */
export async function listOAuthClients(): Promise<OAuthClientSummary[]> {
  const rows = await db
    .select({
      clientId: oauthClient.clientId,
      name: oauthClient.name,
      redirectUris: oauthClient.redirectUris,
      scopes: oauthClient.scopes,
      tokenEndpointAuthMethod: oauthClient.tokenEndpointAuthMethod,
      disabled: oauthClient.disabled,
      createdAt: oauthClient.createdAt,
    })
    .from(oauthClient)
    .orderBy(desc(oauthClient.createdAt));

  const links = await db
    .select({
      clientId: oauthClientResource.clientId,
      identifier: oauthClientResource.resourceId,
    })
    .from(oauthClientResource);

  return rows.map((row) => ({
    ...row,
    resources: links
      .filter((link) => link.clientId === row.clientId)
      .map((link) => link.identifier),
  }));
}

/** Korunan API'ler (resource). */
export async function listOAuthResources(): Promise<OAuthResourceSummary[]> {
  return db
    .select({
      identifier: oauthResource.identifier,
      name: oauthResource.name,
      accessTokenTtl: oauthResource.accessTokenTtl,
      allowedScopes: oauthResource.allowedScopes,
    })
    .from(oauthResource)
    .orderBy(desc(oauthResource.createdAt));
}

/** Kayıtlı bir client var mı? */
export async function oauthClientExists(clientId: string): Promise<boolean> {
  const rows = await db
    .select({ clientId: oauthClient.clientId })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1);

  return rows.length > 0;
}

/** Tanımlı bir resource var mı? */
export async function oauthResourceExists(identifier: string): Promise<boolean> {
  const rows = await db
    .select({ identifier: oauthResource.identifier })
    .from(oauthResource)
    .where(eq(oauthResource.identifier, identifier))
    .limit(1);

  return rows.length > 0;
}

/** Onay ekranında gösterilecek organizasyon. */
export async function getOrganizationSummary(
  organizationId: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return rows[0] ?? null;
}
