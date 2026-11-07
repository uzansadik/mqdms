import { addJob } from "@mqdms/queue";
import { NextResponse } from "next/server";

export async function GET() {
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
