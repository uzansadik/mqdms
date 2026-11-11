"use client";

import { authClient } from "@mqdms/auth/client";
import { useI18n } from "@mqdms/i18n";
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
  clientName,
  redirectHost,
  scopes,
}: {
  clientName: string;
  redirectHost: string;
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
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          className="flex-1"
          variant="outline"
          disabled={pending !== null}
          onClick={() => decide(false)}
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
