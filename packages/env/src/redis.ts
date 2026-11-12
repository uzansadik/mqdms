import { z } from "zod";

const redisEnvSchema = z.object({
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
});

export const redisEnv = redisEnvSchema.parse({
  REDIS_URL: process.env.REDIS_URL,
});

export type RedisEnv = z.infer<typeof redisEnvSchema>;
