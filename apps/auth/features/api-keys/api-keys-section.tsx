"use client";

import { authClient } from "@mqdms/auth/client";
import { Button } from "@mqdms/ui/components/button";
import { Input } from "@mqdms/ui/components/input";
import { useCallback, useEffect, useState } from "react";
import { auditApiKeyCreated, auditApiKeyRevoked } from "./actions";

type ApiKeysSectionProps = {
  organizationId: string;
};

export function ApiKeysSection({ organizationId }: ApiKeysSectionProps) {
  const [name, setName] = useState("");
  const [keys, setKeys] = useState<any[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    const { data, error } = await authClient.apiKey.list({
      query: {
        configId: "org-keys",
        organizationId,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    if (!error && data) {
      setKeys(data.apiKeys);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey() {
    const { data, error } = await authClient.apiKey.create({
      configId: "org-keys",

      organizationId,

      name: name.trim() || "Organization API Key",
    });

    if (error || !data) {
      return;
    }

    /*
     * Raw key sadece create response'da gelir.
     * Daha sonra tekrar gösterilemez.
     */
    setCreatedKey(data.key);
    setName("");
    await auditApiKeyCreated({
      organizationId,
      keyId: data.id,
      name: name.trim() || "Organization API Key",
      prefix: data.prefix,
    });

    await loadKeys();
  }

  async function deleteKey(keyId: string) {
    const { error } = await authClient.apiKey.delete({
      configId: "org-keys",
      keyId,
    });

    await auditApiKeyRevoked({
      organizationId,
      keyId,
    });

    if (!error) {
      await loadKeys();
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Production API"
        />

        <Button type="button" onClick={createKey}>
          Create API key
        </Button>
      </div>

      {createdKey && (
        <div className="rounded-lg border p-4">
          <p className="font-medium">API key created</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Copy this key now. You won't be able to see it again.
          </p>

          <code className="mt-4 block break-all rounded bg-muted p-3 text-sm">{createdKey}</code>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">{key.name ?? "Unnamed key"}</p>

              <p className="text-xs text-muted-foreground">
                {key.prefix}
                {key.start ? `${key.start}...` : ""}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => deleteKey(key.id)}>
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
