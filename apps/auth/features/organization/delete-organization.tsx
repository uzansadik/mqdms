"use client";

import { authClient } from "@mqdms/auth/client";
import { Button } from "@mqdms/ui/components/button";
import { Input } from "@mqdms/ui/components/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteOrganizationProps = {
  organizationId: string;
  organizationName: string;
};

export function DeleteOrganization({ organizationId, organizationName }: DeleteOrganizationProps) {
  const router = useRouter();

  const [confirmation, setConfirmation] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation === organizationName;

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await authClient.organization.delete({
      organizationId,
    });

    if (error) {
      setError(error.message ?? "Unable to delete organization.");

      setLoading(false);
      return;
    }

    const { data: organizations } = await authClient.organization.list();

    const nextOrganization = organizations?.[0];

    if (nextOrganization) {
      await authClient.organization.setActive({
        organizationId: nextOrganization.id,
      });

      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-lg border border-destructive/30 p-6">
      <div>
        <h2 className="font-semibold">Delete organization</h2>

        <p className="text-sm text-muted-foreground">
          Permanently delete this organization and its membership data.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Type <strong>{organizationName}</strong> to confirm.
        </p>

        <Input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="destructive"
        disabled={!canDelete || loading}
        onClick={handleDelete}
      >
        {loading ? "Deleting..." : "Delete organization"}
      </Button>
    </div>
  );
}
