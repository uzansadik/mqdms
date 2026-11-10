import { db } from "@mqdms/db";
import { invitation, member, organization, user } from "@mqdms/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getFreshSession, requireFreshSession } from "@/features/auth/session";

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  memberCount: number;
};

export type AdminMember = {
  id: string;
  role: string;
  createdAt: Date;
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  /** `user.banned` kolonu nullable (`DEFAULT false`, `NOT NULL` değil). */
  banned: boolean | null;
};

export type AdminInvitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  /** `user.banned` kolonu nullable (`DEFAULT false`, `NOT NULL` değil). */
  banned: boolean | null;
  createdAt: Date;
};

/**
 * Kullanıcının platform rolü superadmin mi?
 *
 * Oturum cookie cache'i atlanarak okunur: rolü düşürülen bir superadmin,
 * cache süresi dolmadan superadmin sayılmamalıdır.
 */
export async function isSuperadmin(): Promise<boolean> {
  const session = await getFreshSession();

  return session?.user.role === "superadmin";
}

/** Superadmin olmayan kullanıcıyı uzaklaştırır. */
export async function requireSuperadmin() {
  const session = await requireFreshSession();

  if (session.user.role !== "superadmin") {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Tüm organizasyonlar.
 *
 * better-auth'in `listOrganizations` endpoint'i yalnızca kullanıcının üye
 * olduğu organizasyonları döndürür. Superadmin üye olmadığı için panel
 * sorguları doğrudan veritabanından yapılır.
 */
export async function listAllOrganizations(): Promise<AdminOrganization[]> {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      memberCount: count(member.id),
    })
    .from(organization)
    .leftJoin(member, eq(member.organizationId, organization.id))
    .groupBy(organization.id)
    .orderBy(desc(organization.createdAt));
}

export async function getOrganizationById(organizationId: string) {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listOrganizationMembers(organizationId: string): Promise<AdminMember[]> {
  return db
    .select({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      userId: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      banned: user.banned,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId))
    .orderBy(member.createdAt);
}

export async function listOrganizationInvitations(
  organizationId: string,
): Promise<AdminInvitation[]> {
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(eq(invitation.organizationId, organizationId))
    .orderBy(desc(invitation.createdAt));
}

export async function listAllUsers(): Promise<AdminUser[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));
}

export async function getPlatformStats() {
  const [organizations, users, members, superadmins] = await Promise.all([
    db.select({ id: organization.id }).from(organization),
    db.select({ id: user.id }).from(user),
    db.select({ id: member.id }).from(member),
    db.select({ id: user.id }).from(user).where(eq(user.role, "superadmin")),
  ]);

  return {
    organizationCount: organizations.length,
    userCount: users.length,
    memberCount: members.length,
    superadminCount: superadmins.length,
  };
}
