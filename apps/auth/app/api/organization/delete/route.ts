import { auth } from "@mqdms/auth/server";

import { getSession } from "@/features/auth/session";
import { getCurrentOrganizationMember, requireOrganization } from "@/features/organization/server";

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = await requireOrganization();
  const member = await getCurrentOrganizationMember(organization.id);

  if (member?.role !== "owner") {
    return Response.json(
      {
        error: "Only the organization owner can delete this organization.",
      },
      { status: 403 },
    );
  }

  try {
    await auth.api.deleteOrganization({
      body: {
        organizationId: organization.id,
      },
      headers: new Headers(),
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete organization:", error);

    return Response.json(
      {
        error: "Unable to delete organization.",
      },
      { status: 500 },
    );
  }
}
