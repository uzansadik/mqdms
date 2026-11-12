"use server";

import { writeAuditLog } from "@mqdms/audit";
import { provisionUserWithPassword } from "@mqdms/auth/provisioning";
import { db } from "@mqdms/db";
import { invitation, user } from "@mqdms/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export type InvitationRegistrationResult = { success: true } | { success: false; error: string };

const invitationRegistrationSchema = z.object({
  invitationId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be at most 100 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

/**
 * Davet bağlantısıyla hesap açar.
 *
 * Genel kayıt kapalı olduğu için hesap yalnızca iki kaynaktan oluşur: superadmin
 * ve geçerli bir davet. Bu aksiyon ikinci kaynağı uygular:
 *
 * - Davet gerçek, `pending` ve süresi dolmamış olmalı.
 * - Hesap **davet edilen e-posta adresiyle** açılır; e-posta form üzerinden
 *   değiştirilemez.
 * - Kullanıcı adı ve parola sunucu tarafında doğrulanır.
 */
export async function registerWithInvitationAction(
  input: unknown,
): Promise<InvitationRegistrationResult> {
  const parsed = invitationRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid registration data." };
  }

  const { invitationId, name, password } = parsed.data;

  const invitations = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);

  const invite = invitations[0];

  if (!invite) {
    return { success: false, error: "This invitation is invalid or has expired." };
  }

  if (invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
    return { success: false, error: "This invitation is invalid or has expired." };
  }

  const email = invite.email.trim().toLowerCase();

  const existingUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existingUsers.length > 0) {
    return {
      success: false,
      error: "An account already exists for this e-mail address. Sign in instead.",
    };
  }

  /*
   * Hesap, davet bağlantısının sunucu tarafı provisioning yolundan açılır:
   * genel kayıt endpoint'i kapalıdır, parola better-auth'ın kendi hash
   * fonksiyonuyla saklanır.
   */
  let createdUserId: string | undefined;

  try {
    const created = await provisionUserWithPassword({
      name,
      email,
      password,
    });

    createdUserId = created.id;
  } catch (error) {
    console.error("Failed to create the invited account:", error);

    return { success: false, error: "Unable to create your account." };
  }

  if (!createdUserId) {
    return { success: false, error: "Unable to create your account." };
  }

  /*
   * Davet bağlantısı e-posta adresinin kontrolünü kanıtlar: link, davet
   * e-postasındaki tek kullanımlık jetonla aynı güvenlik sınıfındadır. Bu
   * yüzden hesap doğrulanmış sayılır — aksi halde giriş `EMAIL_NOT_VERIFIED`
   * ile reddedilir ve davet kabul edilemez (`requireEmailVerificationOnInvitation`).
   */
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, createdUserId));

  /*
   * Kullanıcı henüz oturum açmadığı için `features/audit/server.ts` yerine
   * doğrudan audit log yazılır; aktör yeni oluşturulan hesaptır.
   */
  await writeAuditLog({
    organizationId: invite.organizationId,

    actorId: createdUserId,

    action: "user.registered",

    target: {
      type: "user",
      id: createdUserId,
    },

    metadata: {
      email,
      invitationId,
      role: invite.role,
    },
  });

  return { success: true };
}
