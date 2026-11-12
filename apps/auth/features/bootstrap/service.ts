import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { FACTORY_SEED_VERSION, seedFactoryRoles } from "@mqdms/auth/permissions/server";
import { findUserByEmail, provisionUserWithPassword } from "@mqdms/auth/provisioning";
import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { bootstrapState, organization } from "@mqdms/db/schema";
import { authEnv } from "@mqdms/env/auth";
import { and, eq, sql } from "drizzle-orm";

import type { BootstrapValues } from "./schema";

const BOOTSTRAP_LOCK_ID = 723451901;
const BOOTSTRAP_ROW_ID = "bootstrap";

/**
 * Bootstrap neden kullanılamıyor?
 *
 * - `disabled`: env bayrağı kapalı ya da anahtar 32 karakterden kısa.
 * - `already-initialized`: tabloda zaten tamamlanmış bir bootstrap var ya da
 *   bir organizasyon oluşturulmuş.
 */
export type BootstrapUnavailableReason = "disabled" | "already-initialized";

export type BootstrapStatus =
  | { available: true }
  | { available: false; reason: BootstrapUnavailableReason };

/**
 * Formda girilen bootstrap anahtarı hatalı.
 *
 * Bu, kullanıcının kendi girdisine dönen bir hata olduğu için sunucu
 * hata mesajlarından ayrı tutulur; iç hata detayları sızdırılmaz.
 */
export class InvalidBootstrapKeyError extends Error {
  constructor() {
    super("Invalid bootstrap key");
    this.name = "InvalidBootstrapKeyError";
  }
}

/** Bootstrap durumunu okur. */
export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  if (!authEnv.ORG_BOOTSTRAP_ENABLED) {
    return { available: false, reason: "disabled" };
  }

  const key = authEnv.ORG_BOOTSTRAP_KEY;

  if (!key || key.length < 32) {
    return { available: false, reason: "disabled" };
  }

  const completed = await db
    .select({ id: bootstrapState.id })
    .from(bootstrapState)
    .where(eq(bootstrapState.id, BOOTSTRAP_ROW_ID))
    .limit(1);

  if (completed.length > 0) {
    return { available: false, reason: "already-initialized" };
  }

  const organizations = await db.select({ id: organization.id }).from(organization).limit(1);

  if (organizations.length > 0) {
    return { available: false, reason: "already-initialized" };
  }

  return { available: true };
}

/** Anahtarı sabit zamanlı olarak doğrular. */
function verifyBootstrapKey(provided: string) {
  const expected = authEnv.ORG_BOOTSTRAP_KEY;

  if (!expected || expected.length < 32) {
    return false;
  }

  const expectedHash = createHash("sha256").update(expected).digest();

  const providedHash = createHash("sha256").update(provided).digest();

  return timingSafeEqual(expectedHash, providedHash);
}

/**
 * İlk organizasyonu ve owner hesabını oluşturur.
 *
 * Akış:
 *
 * 1. Advisory lock alınır (eşzamanlı istekler sıraya girer).
 * 2. Bootstrap durumu `pending` olarak yazılır.
 * 3. Owner hesabı oluşturulur (varsa atlanır — kurtarma akışı).
 * 4. Organizasyon ve owner üyeliği oluşturulur (varsa atlanır).
 * 5. Fabrika rolleri seed edilir (idempotent).
 * 6. Durum `completed` olarak işaretlenir.
 *
 * Adımlar tek tek idempotenttir: yarım kalan bir kurulum yeniden denendiğinde
 * kaldığı yerden devam eder.
 */
export async function bootstrapOrganization(input: BootstrapValues) {
  if (!authEnv.ORG_BOOTSTRAP_ENABLED) {
    throw new Error("Bootstrap is disabled");
  }

  if (!verifyBootstrapKey(input.bootstrapKey)) {
    throw new InvalidBootstrapKeyError();
  }

  const status = await getBootstrapStatus();

  if (!status.available) {
    throw new Error("Bootstrap is not available");
  }

  /*
   * Requires at least two available database connections because Better Auth
   * uses its own transaction.
   */
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_ID})`);

    /*
     * Bu kontrol kilit alındıktan **sonra** yapılmalıdır: kilit öncesi
     * yapılan kontrolda iki eşzamanlı istek aynı sonucu görebilir.
     */
    const existingState = await tx
      .select({ id: bootstrapState.id })
      .from(bootstrapState)
      .where(eq(bootstrapState.id, BOOTSTRAP_ROW_ID))
      .limit(1);

    if (existingState.length > 0) {
      throw new Error("Bootstrap already completed");
    }

    await tx.insert(bootstrapState).values({
      id: BOOTSTRAP_ROW_ID,
      status: "pending",
    });
  });

  /*
   * Hesap ve organizasyon oluşturma better-auth'ın kendi çağrılarıyla
   * yapılır; bu çağrılar kendi transaction'larını yönettiği için dış
   * transaction tek başına atomiklik sağlamaz. Bu yüzden akış idempotent bir
   * durum makinesi olarak kurulmuştur: her adım "zaten var mı?" kontrolüyle
   * başlar ve yarım kalan kurulum yeniden denendiğinde tamamlanır.
   */
  const existingUser = await findUserByEmail(input.email);

  const ownerUserId =
    existingUser?.id ??
    (
      await provisionUserWithPassword({
        email: input.email,
        name: input.name,
        password: input.password,
      })
    ).id;

  const organizationId = await ensureOrganization({
    name: input.organizationName,
    slug: input.organizationSlug,
    ownerUserId,
  });

  await seedFactoryRoles(organizationId, ownerUserId);

  await db
    .update(bootstrapState)
    .set({
      status: "completed",
      organizationId,
      ownerUserId,
      seedVersion: FACTORY_SEED_VERSION,
    })
    .where(eq(bootstrapState.id, BOOTSTRAP_ROW_ID));

  /*
   * Doğrulama e-postası kurulum tamamlandıktan sonra gönderilir. Hesap zaten
   * oluşmuş olduğu için gönderim hatası kurulumu geri almaz; bir sonraki
   * giriş denemesinde yeniden gönderilebilir.
   */
  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: input.email,
        callbackURL: "/login",
      },
    });
  } catch {
    // Kullanıcı zaten oluşturuldu; doğrulama sonraki girişte tekrar gönderilir.
  }

  return { ownerUserId, organizationId };
}

/**
 * Organizasyonu ve owner üyeliğini oluşturur.
 *
 * Organizasyon zaten varsa (slug çakışması) mevcut kayıt döndürülür; böylece
 * yarım kalan kurulum kurtarılabilir.
 */
async function ensureOrganization(input: {
  name: string;
  slug: string;
  ownerUserId: string;
}): Promise<string> {
  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  /*
   * `createOrganization` endpoint'i `userId` verildiğinde "system action"
   * olarak çalışır: oturum taşımaz ve `allowUserToCreateOrganization`
   * kısıtını atlar. `creatorRole` varsayılanı `owner`'dır.
   */
  const created = await auth.api.createOrganization({
    body: {
      name: input.name,
      slug: input.slug,
      userId: input.ownerUserId,
    },
  });

  if (!created?.id) {
    throw new Error("Organization creation failed");
  }

  return created.id;
}

/** Bootstrap durumu (tanılama için). */
export async function readBootstrapState() {
  const rows = await db
    .select({
      id: bootstrapState.id,
      status: bootstrapState.status,
      organizationId: bootstrapState.organizationId,
      ownerUserId: bootstrapState.ownerUserId,
      seedVersion: bootstrapState.seedVersion,
    })
    .from(bootstrapState)
    .where(eq(bootstrapState.id, BOOTSTRAP_ROW_ID))
    .limit(1);

  return rows[0] ?? null;
}

/** Bootstrap tamamlanmış mı? */
export async function isBootstrapCompleted(): Promise<boolean> {
  const rows = await db
    .select({ id: bootstrapState.id })
    .from(bootstrapState)
    .where(and(eq(bootstrapState.id, BOOTSTRAP_ROW_ID), eq(bootstrapState.status, "completed")))
    .limit(1);

  return rows.length > 0;
}
