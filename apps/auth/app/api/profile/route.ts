import { auth } from "@mqdms/auth/server";
import { deleteObject, deleteObjectByPublicUrl, verifyUploadedObject } from "@mqdms/storage/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/features/auth/session";

const schema = z.object({
  name: z.string().trim().min(2).max(100),

  avatarKey: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
      },
      {
        status: 400,
      },
    );
  }

  let newAvatarKey: string | undefined;
  let newAvatarUrl: string | undefined;

  if (parsed.data.avatarKey) {
    try {
      const object = await verifyUploadedObject({
        key: parsed.data.avatarKey,
        purpose: "user-avatar",
        ownerId: session.user.id,
      });

      if (!object.url) {
        return NextResponse.json(
          {
            error: "Storage public URL is not configured.",
          },
          {
            status: 500,
          },
        );
      }

      newAvatarKey = object.key;
      newAvatarUrl = object.url;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid avatar.",
        },
        {
          status: 400,
        },
      );
    }
  }

  try {
    const user = await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data.name,

        ...(newAvatarUrl
          ? {
              image: newAvatarUrl,
            }
          : {}),
      },
    });

    if (newAvatarUrl && session.user.image && session.user.image !== newAvatarUrl) {
      void deleteObjectByPublicUrl(session.user.image).catch(console.error);
    }

    return NextResponse.json(user);
  } catch {
    if (newAvatarKey) {
      void deleteObject(newAvatarKey).catch(console.error);
    }

    return NextResponse.json(
      {
        error: "Unable to update profile.",
      },
      {
        status: 500,
      },
    );
  }
}
