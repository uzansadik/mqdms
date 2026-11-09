import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@mqdms/env/server";

import { storageClient } from "./client";
import type { UploadPurpose } from "./types";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type VerifyUploadedObjectInput = {
  key: string;
  purpose: UploadPurpose;
  ownerId: string;
};

export async function verifyUploadedObject({ key, purpose, ownerId }: VerifyUploadedObjectInput) {
  const expectedPrefix = `${purpose}/${ownerId}/`;

  if (!key.startsWith(expectedPrefix)) {
    throw new Error("Invalid object key.");
  }

  const result = await storageClient.send(
    new HeadObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    }),
  );

  const size = result.ContentLength ?? 0;
  const contentType = result.ContentType;

  if (size <= 0 || size > MAX_IMAGE_SIZE || !contentType || !IMAGE_TYPES.has(contentType)) {
    await deleteObject(key);

    throw new Error("Uploaded file is invalid.");
  }

  return {
    key,
    size,
    contentType,
    url: getPublicObjectUrl(key),
  };
}

export async function deleteObject(key: string) {
  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    }),
  );
}

export function getPublicObjectUrl(key: string) {
  if (!env.STORAGE_PUBLIC_URL) {
    return null;
  }

  return new URL(key, `${env.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/`).toString();
}

export function getObjectKeyFromPublicUrl(url: string) {
  if (!env.STORAGE_PUBLIC_URL) {
    return null;
  }

  try {
    const baseUrl = new URL(`${env.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/`);

    const objectUrl = new URL(url);

    if (objectUrl.origin !== baseUrl.origin) {
      return null;
    }

    const basePath = baseUrl.pathname.replace(/\/$/, "");

    if (!objectUrl.pathname.startsWith(`${basePath}/`)) {
      return null;
    }

    return decodeURIComponent(objectUrl.pathname.slice(basePath.length + 1));
  } catch {
    return null;
  }
}

export async function deleteObjectByPublicUrl(url: string) {
  const key = getObjectKeyFromPublicUrl(url);

  if (!key) {
    return false;
  }

  await deleteObject(key);

  return true;
}
