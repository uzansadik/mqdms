import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { user } from "@mqdms/db/schema";
import { sql } from "drizzle-orm";

import type { BootstrapValues } from "./schema";

const BOOTSTRAP_LOCK_ID = 723451901;

export async function isBootstrapAvailable() {
  if (process.env.SUPERADMIN_BOOTSTRAP_ENABLED !== "true") {
    return false;
  }

  const key = process.env.SUPERADMIN_BOOTSTRAP_KEY;

  if (!key || key.length < 32) {
    return false;
  }

  const existingUsers = await db.select({ id: user.id }).from(user).limit(1);

  return existingUsers.length === 0;
}

function verifyBootstrapKey(provided: string) {
  const expected = process.env.SUPERADMIN_BOOTSTRAP_KEY;

  if (!expected || expected.length < 32) {
    return false;
  }

  const expectedHash = createHash("sha256").update(expected).digest();

  const providedHash = createHash("sha256").update(provided).digest();

  return timingSafeEqual(expectedHash, providedHash);
}

export async function createSuperadmin(input: BootstrapValues) {
  if (process.env.SUPERADMIN_BOOTSTRAP_ENABLED !== "true") {
    throw new Error("Bootstrap is disabled");
  }

  if (!verifyBootstrapKey(input.bootstrapKey)) {
    throw new Error("Invalid bootstrap key");
  }

  // Requires at least two available database
  // connections because Better Auth uses its own.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_ID})`);

    // This check MUST happen after acquiring the lock.
    const existingUsers = await tx.select({ id: user.id }).from(user).limit(1);

    if (existingUsers.length > 0) {
      throw new Error("Bootstrap already completed");
    }

    const created = await auth.api.createUser({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: "superadmin",
      },
    });

    if (!created?.user?.id) {
      throw new Error("User creation failed");
    }

    return {
      userId: created.user.id,
      email: input.email,
    };
  });

  // Verification must not happen inside
  // the PostgreSQL advisory lock.
  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: result.email,
        callbackURL: "/login",
      },
    });
  } catch {
    // The user is already created.
    // Better Auth's sendOnSignIn=true can resend
    // verification on the next sign-in attempt.
  }

  return result;
}
