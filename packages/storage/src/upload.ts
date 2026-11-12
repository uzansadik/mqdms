import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageEnv as env } from "@mqdms/env/storage";

import { storageClient } from "./client";
import { createObjectKey } from "./keys";
import type { CreateUploadInput, PresignedUpload } from "./types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const UPLOAD_EXPIRES_IN = 60;

export async function createPresignedUpload(input: CreateUploadInput): Promise<PresignedUpload> {
  if (!IMAGE_TYPES.has(input.contentType)) {
    throw new Error("Unsupported file type.");
  }

  if (input.size > MAX_IMAGE_SIZE) {
    throw new Error("File must be smaller than 5 MB.");
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
