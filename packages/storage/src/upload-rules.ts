/**
 * Yükleme kuralları.
 *
 * Her amaç için izin verilen içerik tipleri ve boyut sınırı ayrıdır: profil
 * görselleri ile import dosyaları aynı kurallara tabi olmaz.
 */
export type UploadRule = {
  /** İzin verilen içerik tipleri. */
  contentTypes: readonly string[];

  /** Azami dosya boyutu (bayt). */
  maxSize: number;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const SPREADSHEET_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Import dosyaları için üst sınır. */
const MAX_IMPORT_SIZE = 25 * 1024 * 1024;

/** Amaç → yükleme kuralı. */
export const uploadRules: Record<string, UploadRule> = {
  "user-avatar": {
    contentTypes: IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
  },

  "organization-logo": {
    contentTypes: IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
  },

  "customer-logo": {
    contentTypes: IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
  },

  "import-file": {
    contentTypes: SPREADSHEET_TYPES,
    maxSize: MAX_IMPORT_SIZE,
  },
};

/**
 * İçerik tipinin uzantısı.
 *
 * Excel dosyaları `.xlsx`, düz metin ve CSV dosyaları `.csv` olur. Uzantı
 * içerik tipinden türetilir; dosya adına güvenilmez.
 */
export function getExtension(contentType: string): string | null {
  switch (contentType) {
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";

    case "text/csv":
    case "application/csv":
    case "text/plain":
      return "csv";

    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return null;
  }
}

/**
 * Verilen içerik tipi ve boyut, amaca uygun mu?
 */
export function isUploadAllowed(
  purpose: string,
  contentType: string,
  size: number,
): { allowed: boolean; reason?: string } {
  const rule = uploadRules[purpose];

  if (!rule) {
    return { allowed: false, reason: "Unsupported upload purpose." };
  }

  if (!rule.contentTypes.includes(contentType)) {
    return { allowed: false, reason: "Unsupported file type." };
  }

  if (size <= 0) {
    return { allowed: false, reason: "The file is empty." };
  }

  if (size > rule.maxSize) {
    const limitInMb = Math.round(rule.maxSize / (1024 * 1024));

    return { allowed: false, reason: `The file must be smaller than ${limitInMb} MB.` };
  }

  return { allowed: true };
}
