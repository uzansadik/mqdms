import { emailEnv } from "@mqdms/env/email";
import { resend } from "./client";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const { data, error } = await resend.emails.send({
    from: emailEnv.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
