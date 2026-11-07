import { sendEmail } from "@mqdms/email";
import type { JobPayloads } from "@mqdms/queue";
import type { Job } from "bullmq";

type EmailSendData = JobPayloads["email.send"];

export async function processEmailSend(job: Job<EmailSendData>) {
  return sendEmail({
    to: job.data.to,
    subject: job.data.subject,
    html: job.data.html,
  });
}
