import { env } from "@mqdms/env/server";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisProducer: IORedis | undefined;
};

export const redisProducer =
  globalForRedis.redisProducer ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisProducer = redisProducer;
}
