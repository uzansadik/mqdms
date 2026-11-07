"use client";

import { authClient } from "@mqdms/auth/client";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AcceptInvitationProps = {
  invitationId: string;
  email: string;
};

export function AcceptInvitation({ invitationId, email }: AcceptInvitationProps) {
  const router = useRouter();

  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);

  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setPendingAction("accept");
    setError(null);

    const { data: invitation, error: invitationError } =
      await authClient.organization.getInvitation({
        query: {
          id: invitationId,
        },
      });

    if (invitationError || !invitation) {
      setError(invitationError?.message ?? "This invitation is invalid or has expired.");

      setPendingAction(null);
      return;
    }

    const { error } = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (error) {
      setError(error.message ?? "Unable to accept invitation.");

      setPendingAction(null);
      return;
    }

    await authClient.organization.setActive({
      organizationId: invitation.organizationId,
    });

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleReject() {
    setPendingAction("reject");
    setError(null);

    const { error } = await authClient.organization.rejectInvitation({
      invitationId,
    });

    if (error) {
      setError(error.message ?? "Unable to decline invitation.");

      setPendingAction(null);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization invitation</CardTitle>

        <CardDescription>You have been invited to join an organization.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Signed in as</p>

          <p className="font-medium">{email}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button disabled={pendingAction !== null} onClick={handleReject} variant="outline">
          {pendingAction === "reject" ? "Declining..." : "Decline"}
        </Button>

        <Button disabled={pendingAction !== null} onClick={handleAccept}>
          {pendingAction === "accept" ? "Joining..." : "Accept invitation"}
        </Button>
      </CardFooter>
    </Card>
  );
}
