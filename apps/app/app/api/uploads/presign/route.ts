import { createPresignedUpload } from "@mqdms/storage/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

const schema = z.object({
  purpose: z.enum(["import-file", "customer-logo"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().positive(),
});

/**
 * İçe aktarım dosyası için presigned yükleme URL'i üretir.
 *
 * Dosya doğrudan depolamaya yüklenir; uygulama sunucusu dosyanın içeriğini
 * görmez.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const context = await requireAuthContext();

  try {
    const upload = await createPresignedUpload({
      purpose: parsed.data.purpose,
      ownerId: context.organization.id,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      size: parsed.data.size,
    });

    return NextResponse.json(upload);
  } catch (error) {
    console.error("Unable to create presigned upload:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create presigned upload.",
      },
      { status: 500 },
    );
  }
}
