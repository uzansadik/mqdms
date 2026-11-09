import { CreateOrganizationForm } from "@/features/admin/components/create-organization-form";
import { requireSuperadmin } from "@/features/admin/server";

export default async function NewOrganizationPage() {
  // Sayfa kendi yetki kontrolünü yapar (layout ile paralel render ediliyor).
  await requireSuperadmin();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <CreateOrganizationForm />
    </div>
  );
}
