import { createPresignedUpload } from "@mqdms/storage/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRequestContext } from "@/features/auth/context";
import { getSession } from "@/features/auth/session";

const schema = z.object({
  purpose: z.enum(["user-avatar", "organization-logo"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().positive(),
});

export async function POST(request: Request) {
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
        error: "Invalid upload request.",
        issues: parsed.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  try {
    let ownerId: string;

    if (parsed.data.purpose === "user-avatar") {
      ownerId = session.user.id;
    } else {
      const context = await requireRequestContext();

      ownerId = context.organizationId;
    }

    const upload = await createPresignedUpload({
      ...parsed.data,
      ownerId,
    });

    return NextResponse.json(upload);
  } catch (error) {
    console.error("Unable to create presigned upload:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create presigned upload.",
      },
      {
        status: 500,
      },
    );
  }
}
