"use server";

import { audit } from "@/features/audit/server";

export async function auditApiKeyCreated(input: {
  organizationId: string;
  keyId: string;
  name?: string | null;
  prefix?: string | null;
}) {
  await audit({
    organizationId: input.organizationId,

    action: "api_key.created",

    target: {
      type: "api_key",
      id: input.keyId,
    },

    metadata: {
      name: input.name ?? null,
      prefix: input.prefix ?? null,
    },
  });
}

export async function auditApiKeyRevoked(input: {
  organizationId: string;
  keyId: string;
  name?: string | null;
}) {
  await audit({
    organizationId: input.organizationId,

    action: "api_key.revoked",

    target: {
      type: "api_key",
      id: input.keyId,
    },

    metadata: {
      name: input.name ?? null,
    },
  });
}
