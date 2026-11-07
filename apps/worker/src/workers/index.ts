import type { QueueName } from "@mqdms/queue";

import { createDefaultWorker } from "./default-worker";
import { createEmailWorker } from "./email-worker";

export type WorkerRuntime = {
  name: QueueName;
  close: () => Promise<void>;
};

type WorkerFactory = () => WorkerRuntime;

const workerFactories: Partial<Record<QueueName, WorkerFactory>> = {
  default: createDefaultWorker,
  email: createEmailWorker,
};

export function createWorkers(queueNames: readonly QueueName[]) {
  return queueNames.map((queueName) => {
    const factory = workerFactories[queueName];

    if (!factory) {
      throw new Error(`No worker implementation registered for queue "${queueName}"`);
    }

    return factory();
  });
}
