import { appConfig } from "@mqdms/config";
import type { ReactNode } from "react";

type OnboardingLayoutProps = {
  children: ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {appConfig.name.charAt(0)}
          </div>

          <span className="font-semibold">{appConfig.name}</span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </main>
  );
}
