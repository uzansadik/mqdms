import { appConfig } from "@mqdms/config";
import { getTranslations } from "@mqdms/i18n/server";
import type { ReactNode } from "react";
import { LanguageSelect } from "@mqdms/i18n/language-select";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  /*
   * Oturumu olan kullanıcının yönlendirilmesi sayfa bazında yapılır.
   */
  const t = await getTranslations();

  return (
    <main className="relative grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-muted lg:flex">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background/20 to-muted" />

        <div className="relative flex w-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              {appConfig.name.charAt(0)}
            </div>

            <span className="text-lg font-semibold">{appConfig.name}</span>
          </div>

          <div className="max-w-lg space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight xl:text-5xl">
              {t("auth.layout.headline")}
            </h1>

            <p className="text-lg text-muted-foreground">{t("auth.layout.description")}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("auth.layout.copyright", {
              year: new Date().getFullYear(),
              name: appConfig.name,
            })}
          </p>
        </div>
      </section>

      <section className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center px-6 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {appConfig.name.charAt(0)}
            </div>

            <span className="font-semibold">{appConfig.name}</span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSelect />
      </div>
    </main>
  );
}
