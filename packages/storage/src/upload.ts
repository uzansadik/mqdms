import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageEnv as env } from "@mqdms/env/storage";

import { storageClient } from "./client";
import { createObjectKey } from "./keys";
import type { CreateUploadInput, PresignedUpload } from "./types";
import { isUploadAllowed } from "./upload-rules";

const UPLOAD_EXPIRES_IN = 60;

export async function createPresignedUpload(input: CreateUploadInput): Promise<PresignedUpload> {
  const check = isUploadAllowed(input.purpose, input.contentType, input.size);

  if (!check.allowed) {
    throw new Error(check.reason ?? "The file cannot be uploaded.");
  }

  const key = createObjectKey(input);

  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(storageClient, command, {
    expiresIn: UPLOAD_EXPIRES_IN,

    signableHeaders: new Set(["content-type"]),
  });

  return {
    key,
    uploadUrl,

    expiresAt: new Date(Date.now() + UPLOAD_EXPIRES_IN * 1000),

    headers: {
      "content-type": input.contentType,
    },
  };
}
