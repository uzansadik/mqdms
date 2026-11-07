import { appConfig } from "@mqdms/config";

import { sendEmail } from "./send";

type VerificationEmailInput = {
  email: string;
  url: string;
};

export function sendVerificationEmail({ email, url }: VerificationEmailInput) {
  return sendEmail({
    to: email,
    subject: `Verify your ${appConfig.name} email`,
    html: `
      <h1>Verify your email</h1>
      <p>Thanks for signing up for ${appConfig.name}.</p>
      <p>
        <a href="${url}">Verify email</a>
      </p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
}

type PasswordResetEmailInput = {
  email: string;
  url: string;
};

export function sendPasswordResetEmail({ email, url }: PasswordResetEmailInput) {
  return sendEmail({
    to: email,
    subject: `Reset your ${appConfig.name} password`,
    html: `
      <h1>Reset your password</h1>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${url}">Reset password</a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

type OrganizationInvitationEmailInput = {
  email: string;
  inviterName: string;
  organizationName: string;
  url: string;
};

export function sendOrganizationInvitationEmail({
  email,
  inviterName,
  organizationName,
  url,
}: OrganizationInvitationEmailInput) {
  return sendEmail({
    to: email,
    subject: `You've been invited to ${organizationName}`,
    html: `
      <h1>Organization invitation</h1>
      <p>
        ${inviterName} invited you to join
        <strong>${organizationName}</strong> on ${appConfig.name}.
      </p>
      <p>
        <a href="${url}">Accept invitation</a>
      </p>
    `,
  });
}
