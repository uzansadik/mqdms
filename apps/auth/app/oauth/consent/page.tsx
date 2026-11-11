import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { getMemberships, resolveAuthorizationOrganization } from "@mqdms/auth/permissions/publish";
import { auth } from "@mqdms/auth/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { ConsentForm } from "@/features/oauth/consent-form";
import {
  buildSignedQuery,
  firstValue,
  OAUTH_ORGANIZATION_COOKIE,
  parseRequestedClaims,
  toSearchParams,
} from "@/features/oauth/query";
import { getOrganizationSummary } from "@/features/oauth/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * OAuth akışındaki onay ekranı.
 *
 * Ekranda gösterilen uygulama adı, istenen izinler ve organizasyon imzalı
 * authorize sorgusundan gelir. Sorgun imzası doğrulanmazsa onay ekranı
 * gösterilmez: aksi halde saldırgan kendi istediği bir uygulama adını
 * gösterip başka bir uygulamayı yetkilendirebilirdi.
 */
export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const search = toSearchParams(params);
  const signedQuery = buildSignedQuery(search);
  const { secret } = await auth.$context;

  if (!signedQuery || !(await verifyOAuthQueryParams(signedQuery, secret))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid request</CardTitle>
          <CardDescription>
            The authorization request is invalid or has expired. Please start again from the
            application.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const clientId = firstValue(params.client_id);

  if (!clientId) {
    redirect("/login");
  }

  const requestHeaders = await headers();

  /*
   * `getOAuthClientPublic` oturum middleware'i kullanır; istek başlıkları
   * iletilmediğinde kullanıcı doğrulanamaz.
   */
  const client = await auth.api.getOAuthClientPublic({
    headers: requestHeaders,
    query: { client_id: clientId },
  });

  /*
   * Organizasyon bağlamı akışa bağlıdır: seçim ekranında seçilen
   * organizasyon cookie'de tutulur. Cookie yoksa oturumun aktif
   * organizasyonu kullanılır, ancak her ikisi de güncel bir üyeliği
   * göstermelidir.
   */
  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(OAUTH_ORGANIZATION_COOKIE)?.value;

  const memberships = await getMemberships(session.user.id);

  /*
   * Akışta seçilen organizasyon önceliklidir; ancak cookie artık geçerli
   * bir üyeliği göstermiyorsa (kullanıcı organizasyondan ayrılmış olabilir)
   * oturumun aktif organizasyonuna düşülür.
   */
  const organizationId =
    resolveAuthorizationOrganization({
      memberships,
      organizationId: selectedOrganizationId,
    }) ??
    resolveAuthorizationOrganization({
      memberships,
      organizationId: session.session.activeOrganizationId ?? undefined,
    });

  /*
   * Seçim, oturumun aktif organizasyonuna sabitlenir: onay anında
   * `referenceId` oturumdan okunduğu için başka bir sekmede organizasyon
   * değiştirilmiş olsa bile token doğru organizasyonu gösterir.
   */
  if (organizationId && organizationId !== session.session.activeOrganizationId) {
    await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId },
    });
  }

  const organization = organizationId ? await getOrganizationSummary(organizationId) : null;

  const redirectUri = firstValue(params.redirect_uri);
  let redirectHost = "";

  try {
    redirectHost = redirectUri ? new URL(redirectUri).host : "";
  } catch {
    redirectHost = "";
  }

  const scope = firstValue(params.scope);
  const scopes = scope ? scope.split(" ").filter(Boolean) : [];

  return (
    <ConsentForm
      claims={parseRequestedClaims(firstValue(params.claims))}
      clientName={client.client_name ?? clientId}
      organizationName={organization?.name ?? null}
      redirectHost={redirectHost}
      roles={memberships
        .filter((membership) => membership.organizationId === organizationId)
        .flatMap((membership) => membership.role.split(",").map((role) => role.trim()))
        .filter(Boolean)}
      scopes={scopes}
    />
  );
}
