import { requireRequestContext } from "@/features/auth/context";
import { OrganizationNav } from "@/features/organization/organization-nav";

export default async function OrganizationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireRequestContext();

  return (
    <div className="space-y-8">
      <OrganizationNav isOwner={context.isOwner} />

      {children}
    </div>
  );
}
