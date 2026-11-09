import { auth } from "@mqdms/auth/server";
import {
  deleteObject,
  deleteObjectByPublicUrl,
  getPublicObjectUrl,
  verifyUploadedObject,
} from "@mqdms/storage/server";
import { z } from "zod";
import { audit } from "@/features/audit/server";
import { getSession } from "@/features/auth/session";
import { getCurrentOrganizationMember, requireOrganization } from "@/features/organization/server";

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

function isOwner(role: string | string[]) {
  const roles = Array.isArray(role) ? role : role.split(",").map((item) => item.trim());

  return roles.includes("owner");
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const organization = await requireOrganization();
  const member = await getCurrentOrganizationMember(organization.id);

  if (!member || !isOwner(member.role)) {
    return Response.json(
      {
        error: "Only the organization owner can update these settings.",
      },
      {
        status: 403,
      },
    );
  }

  const parsed = updateOrganizationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid organization settings.",
        issues: parsed.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  const { name, slug, logoKey } = parsed.data;

  let uploadedLogoUrl: string | undefined;

  if (logoKey) {
    try {
      await verifyUploadedObject({
        key: logoKey,
        purpose: "organization-logo",
        ownerId: organization.id,
      });

      const publicLogoUrl = getPublicObjectUrl(logoKey);

      if (!publicLogoUrl) {
        throw new Error("Storage public URL is not configured.");
      }

      uploadedLogoUrl = publicLogoUrl;
    } catch {
      return Response.json(
        {
          error: "Invalid organization logo.",
        },
        {
          status: 400,
        },
      );
    }
  }

  const previousLogo = organization.logo;

  try {
    const updatedOrganization = await auth.api.updateOrganization({
      body: {
        organizationId: organization.id,

        data: {
          name,
          slug,

          ...(uploadedLogoUrl !== undefined
            ? {
                logo: uploadedLogoUrl,
              }
            : {}),
        },
      },

      headers: request.headers,
    });

    if (uploadedLogoUrl && previousLogo && previousLogo !== uploadedLogoUrl) {
      try {
        await deleteObjectByPublicUrl(previousLogo);
      } catch (error) {
        console.error("Failed to delete previous organization logo:", error);
      }
    }
    await audit({
      organizationId: organization.id,

      action: "organization.updated",

      target: {
        type: "organization",
        id: organization.id,
      },

      metadata: {
        name,
        slug,
        logoChanged: Boolean(logoKey),
      },
    });

    return Response.json({
      organization: updatedOrganization,
    });
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

    return Response.json(
      {
        error: "Unable to update organization.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = await requireOrganization();
  const member = await getCurrentOrganizationMember(organization.id);

  if (member?.role !== "owner") {
    return Response.json(
      {
        error: "Only the organization owner can delete this organization.",
      },
      { status: 403 },
    );
  }

  try {
    await auth.api.deleteOrganization({
      body: {
        organizationId: organization.id,
      },
      headers: new Headers(),
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete organization:", error);

    return Response.json(
      {
        error: "Unable to delete organization.",
      },
      { status: 500 },
    );
  }
}
