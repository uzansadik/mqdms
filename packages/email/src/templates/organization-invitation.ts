type OrganizationInvitationEmailOptions = {
  invitationUrl: string;
  organizationName: string;
  inviterName: string;
};

export function organizationInvitationEmail({
  invitationUrl,
  organizationName,
  inviterName,
}: OrganizationInvitationEmailOptions) {
  return {
    subject: `You've been invited to ${organizationName}`,

    html: `
      <div>
        <h1>Organization invitation</h1>

        <p>
          ${inviterName} invited you to join
          <strong>${organizationName}</strong>.
        </p>

        <p>
          <a href="${invitationUrl}">
            Accept invitation
          </a>
        </p>

        <p>
          If you don't have an account yet, opening this link will ask you to
          create one before the invitation is accepted.
        </p>
      </div>
    `,
  };
}
