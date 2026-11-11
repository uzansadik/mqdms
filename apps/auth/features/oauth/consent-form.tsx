"use client";

import { authClient } from "@mqdms/auth/client";
import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { useState } from "react";

type ConsentPayload = {
  redirect?: boolean;
  url?: string;
};

function getRedirectUrl(payload: unknown): string | undefined {
  const value = payload as ConsentPayload | undefined;

  if (!value?.redirect || typeof value.url !== "string" || value.url.length === 0) {
    return undefined;
  }

  return value.url;
}

/**
 * Onay ekranı.
 *
 * Kullanıcı, tüketen uygulamaya vereceği izinleri görür ve onaylar ya da
 * reddeder. Onay isteği imzalı authorize sorgusunu taşır; sunucu bu sorguyu
 * doğrulamadan kodu üretmez.
 */
export function ConsentForm({
  claims,
  clientName,
  organizationName,
  redirectHost,
  roles,
  scopes,
}: {
  claims: string[];
  clientName: string;
  organizationName: string | null;
  redirectHost: string;
  roles: string[];
  scopes: string[];
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError(null);

    try {
      /*
       * İstek gövdesindeki `oauth_query` istemci plugin'i tarafından
       * sayfanın adres çubuğundan eklenir. Scope gönderilmez: sunucu
       * onaylanan kapsamı imzalı sorgudaki istenen scope'lardan alır.
       */
      const { data, error: consentError } = await authClient.$fetch("/oauth2/consent", {
        method: "POST",
        body: { accept },
      });

      if (consentError) {
        setError(t("oauth.consent.error"));
        return;
      }

      const redirectUrl = getRedirectUrl(data);

      if (!redirectUrl) {
        setError(t("oauth.consent.error"));
        return;
      }

      window.location.href = redirectUrl;
    } catch {
      setError(t("oauth.consent.error"));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("oauth.consent.title")}</CardTitle>
        <CardDescription>{t("oauth.consent.description", { name: clientName })}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-sm text-muted-foreground">
            {t("oauth.consent.redirectHost", { host: redirectHost })}
          </p>

          {organizationName && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("oauth.consent.organization")}</p>
              <p className="text-sm text-muted-foreground">{organizationName}</p>

              {roles.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {scopes.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("oauth.consent.scopes")}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          )}

          {claims.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("oauth.consent.claims")}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {claims.map((claim) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          className="flex-1"
          disabled={pending !== null}
          onClick={() => decide(false)}
          variant="outline"
        >
          {t("oauth.consent.deny")}
        </Button>

        <Button className="flex-1" disabled={pending !== null} onClick={() => decide(true)}>
          {pending === "accept" ? t("oauth.consent.working") : t("oauth.consent.accept")}
        </Button>
      </CardFooter>
    </Card>
  );
}
