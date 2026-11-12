import { verifyUploadedObject } from "@mqdms/storage/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/features/auth/session";
import { requireRequestContext } from "@/features/auth/context";

const schema = z.object({
  purpose: z.enum(["user-avatar", "organization-logo"]),
  key: z.string().min(1),
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
        error: "Invalid request",
      },
      {
        status: 400,
      },
    );
  }

  let ownerId: string;

  if (parsed.data.purpose === "user-avatar") {
    ownerId = session.user.id;
  } else {
    const context = await requireRequestContext();

    ownerId = context.organizationId;
  }

  try {
    const object = await verifyUploadedObject({
      key: parsed.data.key,
      purpose: parsed.data.purpose,
      ownerId,
    });

    return NextResponse.json(object);
  } catch {
    return NextResponse.json(
      {
        error: "Unable to verify uploaded file.",
      },
      {
        status: 400,
      },
    );
  }
}
