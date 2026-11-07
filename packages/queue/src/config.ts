import { queueEnv } from "@mqdms/env/queue";

export const queueConfig = {
  prefix: queueEnv.QUEUE_PREFIX,
} as const;
