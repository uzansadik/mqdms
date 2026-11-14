import { queueConfig } from "@mqdms/queue";
import { createRedisWorkerConnection } from "@mqdms/redis/worker";
import { Worker } from "bullmq";

import { processImportExecute } from "../jobs/import-execute";
import { processSystemPing } from "../jobs/system-ping";

export function createDefaultWorker() {
  const connection = createRedisWorkerConnection();

  const worker = new Worker(
    "default",
    async (job) => {
      switch (job.name) {
        case "system.ping":
          return processSystemPing(job);

        case "import.execute":
          return processImportExecute(job);

        default:
          throw new Error(`Unknown job "${job.name}" in default queue`);
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
    console.log(`[worker:default] completed ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker:default] failed ${job?.name} (${job?.id})`, error);
  });

  worker.on("error", (error) => {
    console.error("[worker:default] error", error);
  });

  return {
    name: "default" as const,
    worker,

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
