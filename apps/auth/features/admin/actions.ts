"use server";

import { randomBytes } from "node:crypto";

import { auth } from "@mqdms/auth/server";
import { db } from "@mqdms/db";
import { member, organization, session as sessionTable, user } from "@mqdms/db/schema";
import { env } from "@mqdms/env/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { audit } from "@/features/audit/server";
import { getFreshSession } from "@/features/auth/session";

import { createOrganizationByAdminSchema } from "./schemas";

export type AdminActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const setUserRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["user", "superadmin"]),
});

const setUserBanSchema = z.object({
  userId: z.string().trim().min(1),
  banned: z.boolean(),
  banReason: z.string().trim().max(255).optional(),
});

/** Kullanıcıya verilecek geçici parola. Kullanıcı ilk girişte sıfırlar. */
function generateTemporaryPassword() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

/**
 * Superadmin oturumunu cookie cache'i atlayarak doğrular.
 *
 * better-auth oturumu 60 saniye cookie içinde cache'ler. Rolü düşürülen veya
 * yasaklanan bir superadmin, cache süresi dolmadan admin aksiyonlarını
 * çalıştırabilirdi. Bu yüzden yetki kontrolü her zaman veritabanından
 * okunan oturumla yapılır.
 */
async function requireSuperadminSession() {
  const session = await getFreshSession();

  if (session?.user.role !== "superadmin") {
    return null;
  }

  return session;
}

/**
 * Superadmin organizasyonu oluşturur ve owner'ı belirler.
 *
 * Superadmin organizasyonun üyesi olmaz; owner, superadmin'in belirlediği
 * e-posta adresine sahip kullanıcıdır. Kullanıcı daha önce kayıt olmadıysa
 * hesabı oluşturulur, doğrulama ve parola sıfırlama e-postaları gönderilir.
 */
export async function createOrganizationAction(
  input: unknown,
): Promise<AdminActionResult<{ organizationId: string }>> {
  const superadmin = await requireSuperadminSession();

  if (!superadmin) {
    return { success: false, error: "Superadmin access required." };
  }

  const parsed = createOrganizationByAdminSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid organization data." };
  }

  const { name, slug, owner } = parsed.data;

  const slugExists = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  if (slugExists.length > 0) {
    return { success: false, error: "This slug is already in use." };
  }

  const existingOwner = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, owner.email))
    .limit(1);

  let ownerUserId = existingOwner[0]?.id;
  let ownerCreated = false;

  if (!ownerUserId) {
    try {
      await auth.api.createUser({
        body: {
          name: owner.name ?? owner.email.split("@")[0] ?? owner.email,
          email: owner.email,
          password: generateTemporaryPassword(),
          role: "user",
        },
      });
    } catch (error) {
      console.error("Failed to create the owner account:", error);

      return { success: false, error: "Unable to create the owner account." };
    }

    const createdOwner = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, owner.email))
      .limit(1);

    ownerUserId = createdOwner[0]?.id;
    ownerCreated = true;
  }

  if (!ownerUserId) {
    return { success: false, error: "Unable to create the owner account." };
  }

  /*
   * Organizasyonu owner adına better-auth üzerinden açıyoruz.
   *
   * `userId` verildiğinde ve istek oturum taşımadığında better-auth bunu
   * "system action" sayar: `allowUserToCreateOrganization` kapalı olsa bile
   * organizasyonu açar ve creator'ı `creatorRole` (varsayılan `owner`) ile
   * üye yapar. Bu yüzden burada `headers` **geçilmez** — oturum olsaydı
   * endpoint `UNAUTHORIZED` dönerdi.
   */
  let organizationId: string;

  try {
    const createdOrganization = await auth.api.createOrganization({
      body: { name, slug, userId: ownerUserId },
    });

    organizationId = createdOrganization.id;
  } catch (error) {
    console.error("Failed to create the organization:", error);

    return { success: false, error: "Unable to create the organization." };
  }

  /*
   * better-auth creator'a daima `creatorRole` verir. Superadmin owner'ı admin
   * olarak atamak istediğinde rolü burada düzeltiyoruz.
   */
  /*
   * better-auth creator'a daima `creatorRole` verir. Superadmin owner'ı admin
   * olarak atamak istediğinde rolü burada düzeltiyoruz.
   *
   * Organizasyon bu noktada zaten oluşmuştur; rol güncellemesi başarısız
   * olursa hata yutulmaz, çağıran tarafa açık bir mesajla bildirilir.
   */
  if (owner.role !== "owner") {
    try {
      await db
        .update(member)
        .set({ role: owner.role })
        .where(and(eq(member.organizationId, organizationId), eq(member.userId, ownerUserId)));
    } catch (error) {
      console.error("Failed to set the owner role:", error);

      return {
        success: false,
        error: "Organization created, but the owner role could not be set.",
      };
    }
  }

  if (ownerCreated) {
    await auth.api
      .sendVerificationEmail({
        body: {
          email: owner.email,
          callbackURL: "/login",
        },
      })
      .catch(console.error);

    /*
     * Parola sıfırlama e-postası yalnızca yeni açılan hesap için gerekir.
     * Mevcut bir kullanıcı owner olarak atanırsa kendi parolası geçerlidir;
     * sıfırlama e-postası göndermek istem dışı bir e-postaya yol açar.
     */
    await auth.api
      .requestPasswordReset({
        body: {
          email: owner.email,
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
        },
      })
      .catch(console.error);
  }

  await audit({
    organizationId,

    action: "organization.created",

    target: {
      type: "organization",
      id: organizationId,
    },

    metadata: {
      name,
      slug,
      ownerEmail: owner.email,
      ownerUserId,
      ownerRole: owner.role,
      ownerCreated,
    },
  });

  return { success: true, data: { organizationId } };
}

/** Superadmin organizasyonu siler. Üyeler, davetler ve grant'ler cascade silinir. */
export async function deleteOrganizationAction(organizationId: string): Promise<AdminActionResult> {
  if (!(await requireSuperadminSession())) {
    return { success: false, error: "Superadmin access required." };
  }

  const existing = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const target = existing[0];

  if (!target) {
    return { success: false, error: "Organization not found." };
  }

  try {
    await db.delete(organization).where(eq(organization.id, organizationId));
  } catch (error) {
    console.error("Failed to delete the organization:", error);

    return { success: false, error: "Unable to delete the organization." };
  }

  await audit({
    action: "organization.deleted",

    target: {
      type: "organization",
      id: organizationId,
    },

    metadata: {
      name: target.name,
      slug: target.slug,
    },
  });

  return { success: true, data: undefined };
}

/** Kullanıcının platform rolünü değiştirir. */
export async function setUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const superadmin = await requireSuperadminSession();

  if (!superadmin) {
    return { success: false, error: "Superadmin access required." };
  }

  const parsed = setUserRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid user data." };
  }

  const { userId, role } = parsed.data;

  if (userId === superadmin.user.id) {
    return { success: false, error: "You cannot change your own role." };
  }

  const target = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const targetUser = target[0];

  if (!targetUser) {
    return { success: false, error: "User not found." };
  }

  await db.update(user).set({ role }).where(eq(user.id, userId));

  /*
   * Oturum cookie'si 5 dakika cache'lenir. Rol değişikliğinin anında geçerli
   * olması için kullanıcının oturumları düşürülür.
   */
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId));

  await audit({
    action: "user.role_changed",

    target: {
      type: "user",
      id: userId,
    },

    metadata: {
      email: targetUser.email,
      role,
    },
  });

  return { success: true, data: undefined };
}

/** Kullanıcıyı yasaklar veya yasağı kaldırır. */
export async function setUserBanAction(input: unknown): Promise<AdminActionResult> {
  const superadmin = await requireSuperadminSession();

  if (!superadmin) {
    return { success: false, error: "Superadmin access required." };
  }

  const parsed = setUserBanSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid user data." };
  }

  const { userId, banned, banReason } = parsed.data;

  if (userId === superadmin.user.id) {
    return { success: false, error: "You cannot ban yourself." };
  }

  const target = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const targetUser = target[0];

  if (!targetUser) {
    return { success: false, error: "User not found." };
  }

  await db
    .update(user)
    .set({
      banned,
      banReason: banned ? (banReason ?? "Banned by a superadmin") : null,
      banExpires: null,
    })
    .where(eq(user.id, userId));

  if (banned) {
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
  }

  await audit({
    action: banned ? "user.banned" : "user.unbanned",

    target: {
      type: "user",
      id: userId,
    },

    metadata: {
      email: targetUser.email,
      banReason: banReason ?? null,
    },
  });

  return { success: true, data: undefined };
}
