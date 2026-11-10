import { db } from "@mqdms/db";
import { invitation, organization, user } from "@mqdms/db/schema";
import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/features/auth/session";
import { AcceptInvitation } from "@/features/organization/accept-invitation";
import { InvitationRegistrationForm } from "@/features/organization/invitation-registration-form";

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

function MessageCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>

          <CardDescription>{description}</CardDescription>

          {action && (
            <Button asChild className="mt-2 w-fit" variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { id } = await searchParams;
  const t = await getTranslations();

  if (!id) {
    return (
      <MessageCard
        description={t("organization.invitation.invalid.description")}
        title={t("organization.invitation.invalid.title")}
      />
    );
  }

  /*
   * Davet sunucu tarafında okunur: davet bağlantısı hesap açma da içerir,
   * dolayısıyla e-posta adresi ve organizasyon sunucuda bilinmelidir.
   */
  const invitations = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, id))
    .limit(1);

  const invite = invitations[0];

  if (!invite) {
    return (
      <MessageCard
        description={t("organization.invitation.invalid.description")}
        title={t("organization.invitation.invalid.title")}
      />
    );
  }

  if (invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
    return (
      <MessageCard
        description={t("organization.invitation.invalid.description")}
        title={t("organization.invitation.invalid.title")}
      />
    );
  }

  const session = await getSession();

  if (session) {
    /*
     * Davet, belirli bir e-posta adresine gönderilmiştir: daveti kabul edebilmek
     * için o adresle giriş yapılmış olmalı.
     */
    if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <MessageCard
          action={{
            label: t("organization.invitation.register.signIn"),
            href: `/login?next=${encodeURIComponent(`/accept-invitation?id=${id}`)}`,
          }}
          description={t("organization.invitation.wrongAccount.description", {
            email: invite.email,
          })}
          title={t("organization.invitation.wrongAccount.title")}
        />
      );
    }

    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AcceptInvitation email={session.user.email} invitationId={id} />
        </div>
      </div>
    );
  }

  const invitedEmail = invite.email.trim().toLowerCase();

  const existingUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, invitedEmail))
    .limit(1);

  /*
   * Hesabı olan davetli doğrudan giriş yapmaya yönlendirilir; daveti kabul
   * etmek için oturum gerekir.
   */
  if (existingUsers.length > 0) {
    const next = `/accept-invitation?id=${encodeURIComponent(id)}`;

    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <InvitationRegistrationForm
          email={invite.email}
          invitationId={id}
          organizationId={invite.organizationId}
          organizationName={invite.organizationName}
        />
      </div>
    </div>
  );
}
