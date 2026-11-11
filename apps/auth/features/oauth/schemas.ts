import { z } from "zod";

/**
 * Yeni tüketen uygulama (OAuth client) formu.
 *
 * Redirect URI'ler ve resource'lar satır satır girilir; sunucu tarafında
 * satırlara bölünüp doğrulanır.
 */
export const createOAuthClientSchema = z.object({
  clientName: z.string().trim().min(2).max(100),

  redirectUris: z
    .string()
    .trim()
    .min(1)
    .refine((value) => splitLines(value).length > 0, {
      message: "At least one redirect URI is required",
    }),

  /** Korunan API URI'si; verilirse access token JWT olur (aud = resource). */
  resources: z.string().trim().optional(),

  scope: z.string().trim().optional(),

  /** PKCE-only (public) client: client secret üretilmez. */
  publicClient: z.boolean().optional(),
});

export type CreateOAuthClientValues = z.infer<typeof createOAuthClientSchema>;

/** Satır satır girilen listeleri böler. */
export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
