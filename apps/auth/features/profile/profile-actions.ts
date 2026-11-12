"use server";

import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { user } from "@mqdms/db/schema";
import { deleteObject, deleteObjectByPublicUrl, verifyUploadedObject } from "@mqdms/storage/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { requireRequestContext } from "@/features/auth/context";

export type ProfileActionResult = { success: true } | { success: false; error: string };

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),

  avatarKey: z.string().min(1).optional(),
});

/**
 * Profili günceller.
 *
 * Oturum zorunludur; kullanıcının hangi hesabı güncellediği istemciden
 * gelmez.
 */
export async function updateProfileAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const context = await requireRequestContext();

  let newAvatarKey: string | undefined;
  let newAvatarUrl: string | undefined;

  if (parsed.data.avatarKey) {
    try {
      const object = await verifyUploadedObject({
        key: parsed.data.avatarKey,
        purpose: "user-avatar",
        ownerId: context.userId,
      });

      if (!object.url) {
        return { success: false, error: "Storage public URL is not configured." };
      }

      newAvatarKey = object.key;
      newAvatarUrl = object.url;
    } catch {
      return { success: false, error: "Invalid avatar." };
    }
  }

  /*
   * `updateUser` yanıtı yalnızca `{ status: true }` döner; eski avatar
   * temizliği için görselin önceki değeri veritabanından okunur.
   */
  const previousRows = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, context.userId))
    .limit(1);

  const previousImage = previousRows[0]?.image ?? null;

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data.name,

        ...(newAvatarUrl ? { image: newAvatarUrl } : {}),
      },
    });

    if (newAvatarUrl && previousImage && previousImage !== newAvatarUrl) {
      void deleteObjectByPublicUrl(previousImage).catch(console.error);
    }

    return { success: true };
  } catch (error) {
    if (newAvatarKey) {
      void deleteObject(newAvatarKey).catch(console.error);
    }

    console.error("Failed to update profile:", error);

    return { success: false, error: "Unable to update profile." };
  }
}
