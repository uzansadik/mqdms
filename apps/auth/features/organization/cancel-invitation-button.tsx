"use client";

import { authClient } from "@mqdms/auth/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@mqdms/ui/components/alert-dialog";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelInvitationButtonProps = {
  invitationId: string;
  email: string;
};

export function CancelInvitationButton({ invitationId, email }: CancelInvitationButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    });

    if (error) {
      setError(error.message ?? "Unable to cancel invitation.");

      setIsPending(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending} size="sm" variant="outline">
            Cancel
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>

            <AlertDialogDescription>
              The invitation sent to {email} will no longer be valid.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={handleCancel}>
              {isPending ? "Cancelling..." : "Cancel invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
