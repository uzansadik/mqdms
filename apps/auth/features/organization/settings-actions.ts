"use server";

import { auth } from "@mqdms/auth/server";
import {
  deleteObject,
  deleteObjectByPublicUrl,
  getPublicObjectUrl,
  verifyUploadedObject,
} from "@mqdms/storage/server";
import { headers } from "next/headers";
import { z } from "zod";

import { audit } from "@/features/audit/server";
import { requireRequestContext } from "@/features/auth/context";

export type OrganizationSettingsResult = { success: true } | { success: false; error: string };

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

  logoKey: z.string().min(1).optional(),
});

/**
 * Organizasyon ayarlarını günceller.
 *
 * Yönetim yetkisi owner'a aittir; organizasyon bağlamı istemciden gelen
 * bir değerle değil, oturumdan türetilir.
 */
export async function updateOrganizationAction(
  input: unknown,
): Promise<OrganizationSettingsResult> {
  const parsed = updateOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid organization settings." };
  }

  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "Only the organization owner can update these settings." };
  }

  const { name, slug, logoKey } = parsed.data;

  let uploadedLogoUrl: string | undefined;

  if (logoKey) {
    try {
      await verifyUploadedObject({
        key: logoKey,
        purpose: "organization-logo",
        ownerId: context.organizationId,
      });

      const publicLogoUrl = getPublicObjectUrl(logoKey);

      if (!publicLogoUrl) {
        throw new Error("Storage public URL is not configured.");
      }

      uploadedLogoUrl = publicLogoUrl;
    } catch {
      return { success: false, error: "Invalid organization logo." };
    }
  }

  const previousLogo = context.organization.logo;

  try {
    await auth.api.updateOrganization({
      body: {
        organizationId: context.organizationId,

        data: {
          name,
          slug,

          ...(uploadedLogoUrl !== undefined ? { logo: uploadedLogoUrl } : {}),
        },
      },

      headers: await headers(),
    });

    if (uploadedLogoUrl && previousLogo && previousLogo !== uploadedLogoUrl) {
      try {
        await deleteObjectByPublicUrl(previousLogo);
      } catch (error) {
        console.error("Failed to delete previous organization logo:", error);
      }
    }

    await audit({
      organizationId: context.organizationId,

      action: "organization.updated",

      target: {
        type: "organization",
        id: context.organizationId,
      },

      metadata: {
        name,
        slug,
        logoChanged: Boolean(logoKey),
      },
    });

    return { success: true };
  } catch (error) {
    /*
     * Upload başarılı oldu ama organization update başarısız olduysa
     * orphan object bırakmayalım.
     */
    if (logoKey) {
      try {
        await deleteObject(logoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded organization logo:", cleanupError);
      }
    }

    console.error("Failed to update organization:", error);

    return { success: false, error: "Unable to update organization." };
  }
}

/** Organizasyonu siler. */
export async function deleteOrganizationAction(): Promise<OrganizationSettingsResult> {
  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "Only the organization owner can delete this organization." };
  }

  try {
    await auth.api.deleteOrganization({
      body: {
        organizationId: context.organizationId,
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete organization:", error);

    return { success: false, error: "Unable to delete organization." };
  }
}
