import { env } from "@mqdms/env/server";
import { S3Client } from "@aws-sdk/client-s3";

export const storageClient = new S3Client({
  region: env.STORAGE_REGION,

  endpoint: env.STORAGE_ENDPOINT,

  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
});
