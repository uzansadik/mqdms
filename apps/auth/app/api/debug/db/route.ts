import { db } from "@mqdms/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getFreshSession } from "@/features/auth/session";

/**
 * Veritabanı ping'i.
 *
 * Bu uç herkese açık bir kimlik sağlayıcıda bilgi sızdırabileceği için
 * yalnızca platform superadmin'ine açıktır.
 */
export async function GET() {
  const session = await getFreshSession();

  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = performance.now();

  await db.execute(sql`select 1`);

  return NextResponse.json({
    databasePingMs: Math.round(performance.now() - start),
  });
}
