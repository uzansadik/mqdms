import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { OrganizationPicker } from "@/features/oauth/organization-picker";
import { getOrganizations } from "@/features/organization/server";

export const dynamic = "force-dynamic";

/**
 * OAuth akışındaki organizasyon seçim adımı.
 *
 * Kullanıcının birden fazla organizasyonu varsa token'ın organizasyon
 * bağlamı burada belirlenir. Üyeliği olmayan kullanıcılar için ekran "erişim
 * yok" durumunu gösterir.
 */
export default async function Page() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const organizations = await getOrganizations();

  return (
    <OrganizationPicker
      organizations={organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }))}
    />
  );
}
