import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { storageEnv as env } from "@mqdms/env/storage";

import { storageClient } from "./client";
import type { UploadPurpose } from "./types";
import { isUploadAllowed } from "./upload-rules";

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

  const check = isUploadAllowed(purpose, contentType ?? "", size);

  if (!check.allowed) {
    await deleteObject(key);

    throw new Error(check.reason ?? "Uploaded file is invalid.");
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

/**
 * Nesneyi indirir.
 *
 * Sunucu tarafında kullanılır: içe aktarım dosyası belleğe okunup ayrıştırılır.
 * Excel formülleri **çalıştırılmaz**; dosyadaki değerler okunur.
 */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const result = await storageClient.send(
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    }),
  );

  if (!result.Body) {
    throw new Error("The object could not be read.");
  }

  const bytes = await result.Body.transformToByteArray();

  return bytes;
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
