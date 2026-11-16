import { getMessages, I18nProvider } from "@mqdms/i18n";
import { getLocale } from "@mqdms/i18n/server";
import { Toaster } from "@mqdms/ui/components/sonner";
import { TooltipProvider } from "@mqdms/ui/components/tooltip";
import { ThemeProvider } from "@mqdms/ui/theme-provider";

import "@mqdms/ui/globals.css";

/**
 * BOM laboratuvarının kök düzeni.
 *
 * Veritabanı ve oturum yoktur; yalnızca arayüz paketi kullanılır.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <TooltipProvider>
              {children}

              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
