"use client";

import { authClient } from "@mqdms/auth/client";
import { env } from "@mqdms/env/client";
import { Button } from "@mqdms/ui/components/button";
import { useState } from "react";

type SelectOrganizationListProps = {
  organizations: {
    id: string;
    name: string;
  }[];
};

/**
 * Organizasyon seçim listesi.
 *
 * Aktif organizasyon better-auth'in `set-active` ucu ile yazılır; seçimden
 * sonra kullanıcı iş uygulamasına gider.
 */
export function SelectOrganizationList({ organizations }: SelectOrganizationListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function select(organizationId: string) {
    setPendingId(organizationId);
    setError(null);

    const { error: setActiveError } = await authClient.organization.setActive({
      organizationId,
    });

    if (setActiveError) {
      setError(setActiveError.message ?? "Unable to switch organization.");
      setPendingId(null);

      return;
    }

    /*
     * Organizasyon seçimi sonrası kullanıcı iş uygulamasına yönlendirilir:
     * auth paneli değil, kullanıcının çalıştığı uygulama açılır.
     */
    window.location.assign(env.NEXT_PUBLIC_BUSINESS_APP_URL);
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {organizations.map((organization) => (
        <Button
          className="w-full justify-start"
          disabled={pendingId !== null}
          key={organization.id}
          onClick={() => select(organization.id)}
          variant="outline"
        >
          {organization.name}
        </Button>
      ))}
    </div>
  );
}
