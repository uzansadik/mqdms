"use client";

import { authClient } from "@mqdms/auth/client";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { useState } from "react";

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

type RedirectPayload = {
  redirect?: boolean;
  url?: string;
};

function getRedirectUrl(payload: unknown): string | undefined {
  const value = payload as RedirectPayload | undefined;

  if (!value?.redirect || typeof value.url !== "string" || value.url.length === 0) {
    return undefined;
  }

  return value.url;
}

/**
 * Organizasyon seçim ekranı.
 *
 * OAuth akışında kullanıcı birden fazla organizasyona üye ise, token'ın
 * hangi organizasyona bağlanacağı burada belirlenir. Seçim, oturumdaki aktif
 * organizasyona yazılır; token claim'leri bu değerden üretilir.
 */
export function OrganizationPicker({ organizations }: { organizations: OrganizationOption[] }) {
  const { t } = useI18n();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function select(organizationId: string) {
    setPendingId(organizationId);
    setError(null);

    try {
      /*
       * Aktif organizasyon oturuma yazılır. `consentReferenceId` bu değeri
       * okur ve token'daki organizasyon bağlamı belirlenir.
       */
      const { data, error: setActiveError } = await authClient.organization.setActive({
        organizationId,
      });

      if (setActiveError) {
        setError(t("oauth.organizations.error"));
        return;
      }

      /*
       * Plugin, oturum çerezi set edilen yanıtlarda OAuth akışını kendisi
       * sürdürür. Sürdürmediyse devam isteği açıkça gönderilir.
       */
      const redirectUrl = getRedirectUrl(data);

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      const { data: continueData, error: continueError } = await authClient.$fetch(
        "/oauth2/continue",
        {
          method: "POST",
          body: { postLogin: true },
        },
      );

      if (continueError) {
        setError(t("oauth.organizations.error"));
        return;
      }

      const continueUrl = getRedirectUrl(continueData);

      if (!continueUrl) {
        setError(t("oauth.organizations.error"));
        return;
      }

      window.location.href = continueUrl;
    } catch {
      setError(t("oauth.organizations.error"));
    } finally {
      setPendingId(null);
    }
  }

  if (organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("oauth.organizations.title")}</CardTitle>
          <CardDescription>{t("oauth.organizations.empty")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("oauth.organizations.title")}</CardTitle>
        <CardDescription>{t("oauth.organizations.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {organizations.map((organization) => (
            <Button
              key={organization.id}
              className="w-full justify-between"
              disabled={pendingId !== null}
              onClick={() => select(organization.id)}
            >
              <span>{organization.name}</span>
              <span className="text-xs text-muted-foreground">
                {pendingId === organization.id
                  ? t("oauth.organizations.selecting")
                  : t("oauth.organizations.select")}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
