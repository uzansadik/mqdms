import { redisProducer } from "@mqdms/redis/producer";
import { type JobsOptions, Queue } from "bullmq";
import { queueConfig } from "./config";

import { type JobName, type JobPayloads, jobQueues } from "./jobs";
import { type QueueName, queueNames } from "./queues";

const defaultJobOptions: JobsOptions = {
  attempts: 5,

  backoff: {
    type: "exponential",
    delay: 1000,
  },

  removeOnComplete: {
    age: 60 * 60,
    count: 10_000,
  },

  removeOnFail: {
    age: 7 * 24 * 60 * 60,
  },
};

const queues = Object.fromEntries(
  queueNames.map((name) => [
    name,
    new Queue(name, {
      connection: redisProducer,
      prefix: queueConfig.prefix,
      defaultJobOptions,
      skipVersionCheck: true,
    }),
  ]),
) as Record<QueueName, Queue>;

export function getQueue(name: QueueName) {
  return queues[name];
}

export async function addJob<TName extends JobName>(
  name: TName,
  data: JobPayloads[TName],
  options?: JobsOptions,
) {
  const queueName = jobQueues[name];
  const queue = getQueue(queueName);

  return queue.add(name, data, options);
}
