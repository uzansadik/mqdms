import { randomUUID } from "node:crypto";

import type { CreateUploadInput } from "./types";
import { getExtension } from "./upload-rules";

export function createObjectKey(input: CreateUploadInput) {
  const extension = getExtension(input.contentType);

  if (!extension) {
    throw new Error("Unsupported file type.");
  }

  return [input.purpose, input.ownerId, `${randomUUID()}.${extension}`].join("/");
}
