import { organizationInvitationEmail, sendEmail } from "@mqdms/email";
import type { JobPayloads } from "@mqdms/queue";
import type { Job } from "bullmq";

type OrganizationInvitationJob = JobPayloads["email.organization-invitation"];

export async function processOrganizationInvitationEmail(job: Job<OrganizationInvitationJob>) {
  const email = organizationInvitationEmail({
    invitationUrl: job.data.invitationUrl,
    organizationName: job.data.organizationName,
    inviterName: job.data.inviterName,
  });

  return sendEmail({
    to: job.data.to,
    subject: email.subject,
    html: email.html,
  });
}
