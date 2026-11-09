import { auth } from "@mqdms/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { requireSession } from "@/features/auth/session";

export const getOrganizations = cache(async () => {
  const result = await auth.api.listOrganizations({
    headers: await headers(),
  });

  return result;
});

function hasRole(role: string | string[], targetRole: string) {
  const roles = Array.isArray(role) ? role : role.split(",").map((item) => item.trim());

  return roles.includes(targetRole);
}

export const getActiveOrganizationMember = cache(async () => {
  return auth.api.getActiveMember({
    headers: await headers(),
  });
});

export async function isOrganizationOwner() {
  const member = await getActiveOrganizationMember();

  return Boolean(member && hasRole(member.role, "owner"));
}
export async function requireOrganizationOwner() {
  const organization = await requireOrganization();
  const member = await getActiveOrganizationMember();

  if (!member || !hasRole(member.role, "owner")) {
    redirect("/dashboard");
  }

  return {
    organization,
    member,
  };
}

export const requireOrganization = cache(async () => {
  const session = await requireSession();
  const requestHeaders = await headers();
  const activeOrganizationId = session.session.activeOrganizationId;

  if (activeOrganizationId) {
    const organization = await auth.api.getOrganization({
      headers: requestHeaders,
      query: {
        organizationId: activeOrganizationId,
      },
    });

    if (organization) {
      return organization;
    }
  }

  const organizations = await getOrganizations();
  const organization = organizations[0];
  if (!organization) {
    redirect("/onboarding");
  }

  await auth.api.setActiveOrganization({
    headers: requestHeaders,
    body: {
      organizationId: organization.id,
    },
  });

  return organization;
});

export const getOrganizationDetails = cache(async (organizationId: string) => {
  const result = await auth.api.getFullOrganization({
    headers: await headers(),
    query: {
      organizationId,
      membersLimit: 100,
    },
  });

  return result;
});

/** Bir organizasyonun üye listesi. */
export const getOrganizationMembers = cache(async (organizationId: string) => {
  const result = await getOrganizationDetails(organizationId);

  return result?.members ?? [];
});

/** Oturumdaki kullanıcının verilen organizasyondaki üye kaydı. */
export async function getOrganizationMember(organizationId: string) {
  const session = await requireSession();
  const members = await getOrganizationMembers(organizationId);

  return members.find((member) => member.userId === session.user.id) ?? null;
}

export const getOrganizationInvitations = cache(async (organizationId: string) => {
  const result = await auth.api.listInvitations({
    headers: await headers(),
    query: {
      organizationId,
    },
  });

  return result;
});
