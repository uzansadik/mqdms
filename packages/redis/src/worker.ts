import { env } from "@mqdms/env/server";
import IORedis from "ioredis";

export function createRedisWorkerConnection() {
  return new IORedis(env.REDIS_URL, {
    // BullMQ blocking connections require this to be exactly null;
    // any other value (including a finite number) makes the worker throw
    // "Your redis options maxRetriesPerRequest must be null."
    maxRetriesPerRequest: null,
  });
}
