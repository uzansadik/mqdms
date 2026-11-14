import { verifyUploadedObject } from "@mqdms/storage/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

const schema = z.object({
  purpose: z.enum(["import-file", "customer-logo"]),
  key: z.string().min(1),
});

/**
 * Yüklenen dosyayı doğrular.
 *
 * Anahtar `{purpose}/{organizationId}/...` önekiyle başlamak zorundadır: başka
 * bir organizasyonun dosyası complete edilemez.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const context = await requireAuthContext();

  try {
    const object = await verifyUploadedObject({
      key: parsed.data.key,
      purpose: parsed.data.purpose,
      ownerId: context.organization.id,
    });

    return NextResponse.json(object);
  } catch {
    return NextResponse.json({ error: "Unable to verify uploaded file." }, { status: 400 });
  }
}
