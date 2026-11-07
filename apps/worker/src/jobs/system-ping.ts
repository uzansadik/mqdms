import type { JobPayloads } from "@mqdms/queue";
import type { Job } from "bullmq";

type SystemPingData = JobPayloads["system.ping"];

export async function processSystemPing(job: Job<SystemPingData>) {
  console.log("[worker] system.ping", {
    jobId: job.id,
    message: job.data.message,
  });

  return {
    received: true,
    message: job.data.message,
  };
}
