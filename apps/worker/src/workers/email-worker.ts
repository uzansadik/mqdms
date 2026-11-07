import { queueConfig } from "@mqdms/queue";
import { createRedisWorkerConnection } from "@mqdms/redis/worker";
import { Worker } from "bullmq";

import {
  processOrganizationInvitationEmail,
  processPasswordResetEmail,
  processVerificationEmail,
} from "../jobs/email";

export function createEmailWorker() {
  const connection = createRedisWorkerConnection();

  const worker = new Worker(
    "email",
    async (job) => {
      switch (job.name) {
        case "email.verification":
          return processVerificationEmail(job);

        case "email.password-reset":
          return processPasswordResetEmail(job);

        case "email.organization-invitation":
          return processOrganizationInvitationEmail(job);

        default:
          throw new Error(`Unknown job "${job.name}" in email queue`);
      }
    },
    {
      connection,
      prefix: queueConfig.prefix,
      concurrency: 10,
      skipVersionCheck: true,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker:email] completed ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker:email] failed ${job?.name} (${job?.id})`, error);
  });

  worker.on("error", (error) => {
    console.error("[worker:email] error", error);
  });

  return {
    name: "email" as const,

    async close() {
      await worker.close();

      try {
        await connection.quit();
      } catch {
        connection.disconnect();
      }
    },
  };
}
