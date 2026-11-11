import { addJob } from "@mqdms/queue";
import { NextResponse } from "next/server";

import { getFreshSession } from "@/features/auth/session";

/**
 * Kuyruk testi.
 *
 * Her çağrıda e-posta kuyruğuna iş atar; bu uç yalnızca platform
 * superadmin'ine açıktır.
 */
export async function GET() {
  const session = await getFreshSession();

  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = performance.now();

  await addJob(
    "email.verification",
    {
      to: "uzansadik@gmail.com",
      verificationUrl: "https://example.com/verify-email-4",
    },
    { deduplication: { id: "test-email-verification-4", ttl: 60 * 10 * 10 * 100 } },
  );

  return NextResponse.json({
    databasePingMs: Math.round(performance.now() - start),
  });
}
