/**
 * Yükleme amacı.
 *
 * `import-file` Excel ve CSV içe aktarım dosyaları içindir; kuralları
 * `upload-rules.ts` dosyasında tanımlıdır.
 */
export type UploadPurpose = "user-avatar" | "organization-logo" | "import-file";

export type CreateUploadInput = {
  purpose: UploadPurpose;
  ownerId: string;

  fileName: string;
  contentType: string;
  size: number;
};

export type PresignedUpload = {
  key: string;
  uploadUrl: string;
  expiresAt: Date;

  headers: {
    "content-type": string;
  };
};
