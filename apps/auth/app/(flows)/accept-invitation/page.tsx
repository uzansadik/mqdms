import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { redirect } from "next/navigation";

import { getSession } from "@/features/auth/session";
import { AcceptInvitation } from "@/features/organization/accept-invitation";

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>

            <CardDescription>This invitation link is invalid or incomplete.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const session = await getSession();

  if (!session) {
    const next = `/accept-invitation?id=${encodeURIComponent(id)}`;

    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <AcceptInvitation email={session.user.email} invitationId={id} />
      </div>
    </div>
  );
}
