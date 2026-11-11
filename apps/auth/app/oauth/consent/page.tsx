import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "@mqdms/auth/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { ConsentForm } from "@/features/oauth/consent-form";
import { buildSignedQuery, firstValue, toSearchParams } from "@/features/oauth/query";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * OAuth akışındaki onay ekranı.
 *
 * Ekranda gösterilen uygulama adı ve izinler, imzalı authorize sorgusundan
 * gelir. Sorgun imzası doğrulanmazsa onay ekranı gösterilmez: aksi halde
 * saldırgan kendi istediği bir uygulama adını gösterip başka bir uygulamayı
 * yetkilendirebilirdi.
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

  const client = await auth.api.getOAuthClientPublic({
    query: { client_id: clientId },
  });

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
      clientName={client.client_name ?? clientId}
      redirectHost={redirectHost}
      scopes={scopes}
    />
  );
}
