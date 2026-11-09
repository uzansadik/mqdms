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
import { useRouter } from "next/navigation";
import { useState } from "react";

type AcceptInvitationProps = {
  invitationId: string;
  email: string;
};

export function AcceptInvitation({ invitationId, email }: AcceptInvitationProps) {
  const router = useRouter();
  const { t } = useI18n();

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
      setError(invitationError?.message ?? t("organization.invitation.invalid.description"));

      setPendingAction(null);
      return;
    }

    const { error } = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (error) {
      setError(error.message ?? t("organization.invitation.acceptError"));

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
      setError(error.message ?? t("organization.invitation.declineError"));

      setPendingAction(null);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("organization.invitation.title")}</CardTitle>

        <CardDescription>{t("organization.invitation.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t("organization.invitation.signedInAs")}</p>

          <p className="font-medium">{email}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button disabled={pendingAction !== null} onClick={handleReject} variant="outline">
          {pendingAction === "reject"
            ? t("organization.invitation.declining")
            : t("organization.invitation.decline")}
        </Button>

        <Button disabled={pendingAction !== null} onClick={handleAccept}>
          {pendingAction === "accept"
            ? t("organization.invitation.joining")
            : t("organization.invitation.accept")}
        </Button>
      </CardFooter>
    </Card>
  );
}
