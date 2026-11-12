import { redisEnv } from "@mqdms/env/redis";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisProducer: IORedis | undefined;
};

export const redisProducer =
  globalForRedis.redisProducer ??
  new IORedis(redisEnv.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisProducer = redisProducer;
}
