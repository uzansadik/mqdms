type UploadPurpose = "user-avatar" | "organization-logo";

type UploadFileInput = {
  file: File;
  purpose: UploadPurpose;
};

type PresignedUpload = {
  key: string;
  uploadUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
};

type UploadedObject = {
  key: string;
  size: number;
  contentType: string;
  url: string | null;
};

export async function uploadFile({ file, purpose }: UploadFileInput): Promise<UploadedObject> {
  const presignResponse = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      purpose,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!presignResponse.ok) {
    const body = await presignResponse.text();

    console.error("Presign failed:", {
      status: presignResponse.status,
      statusText: presignResponse.statusText,
      body,
    });

    throw new Error(`Presign failed (${presignResponse.status}): ${body}`);
  }
  const upload = (await presignResponse.json()) as PresignedUpload;

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload file.");
  }

  const completeResponse = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      purpose,
      key: upload.key,
    }),
  });

  if (!completeResponse.ok) {
    throw new Error("Unable to verify uploaded file.");
  }

  return completeResponse.json();
}
