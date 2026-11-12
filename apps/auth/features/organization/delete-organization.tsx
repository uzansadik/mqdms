"use client";

import { Button } from "@mqdms/ui/components/button";
import { Input } from "@mqdms/ui/components/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteOrganizationAction } from "./settings-actions";

type DeleteOrganizationProps = {
  organizationName: string;
};

export function DeleteOrganization({ organizationName }: DeleteOrganizationProps) {
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

    const result = await deleteOrganizationAction();

    if (!result.success) {
      setError(result.error);

      setLoading(false);
      return;
    }

    /*
     * Organizasyon silindi; kullanıcının başka bir organizasyonu olabilir.
     * Yoksa artık erişimi yoktur.
     */
    router.replace("/no-access");
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
