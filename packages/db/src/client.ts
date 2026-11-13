import { env } from "@mqdms/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (env.APP_ENV === "local") {
  globalForDb.pool = pool;
}

export const db = drizzle({
  client: pool,
  schema,
});

/**
 * Transaction istemcisi.
 *
 * `db.transaction()` içinden gelen istemci aynı sorgu arayüzünü sunar. Bir
 * kaydın ve onu üreten işlemin tek transaction'da yazılması gerektiğinde
 * bu tip kullanılır.
 */
export type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
