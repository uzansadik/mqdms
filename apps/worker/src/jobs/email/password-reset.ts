import { passwordResetEmail, sendEmail } from "@mqdms/email";
import type { JobPayloads } from "@mqdms/queue";
import type { Job } from "bullmq";

type PasswordResetJob = JobPayloads["email.password-reset"];

export async function processPasswordResetEmail(job: Job<PasswordResetJob>) {
  const email = passwordResetEmail({
    resetUrl: job.data.resetUrl,
  });

  return sendEmail({
    to: job.data.to,
    subject: email.subject,
    html: email.html,
  });
}
