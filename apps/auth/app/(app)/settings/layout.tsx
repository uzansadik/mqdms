import { SettingsNav } from "@/features/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-8">
      <SettingsNav />

      {children}
    </div>
  );
}
