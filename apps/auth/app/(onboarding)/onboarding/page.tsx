import { redirect } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { CreateOrganizationForm } from "@/features/organization/create-organization-form";
import { getOrganizations } from "@/features/organization/server";

export default async function OnboardingPage() {
  await requireSession();

  const organizations = await getOrganizations();

  if (organizations.length > 0) {
    redirect("/dashboard");
  }

  return <CreateOrganizationForm />;
}
