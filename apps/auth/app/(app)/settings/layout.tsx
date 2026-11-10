import { canManagePermissions } from "@/features/permissions/server";
import { SettingsNav } from "@/features/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const canManage = await canManagePermissions();

  return (
    <div className="space-y-8">
      <SettingsNav canManagePermissions={canManage} />

      {children}
    </div>
  );
}
