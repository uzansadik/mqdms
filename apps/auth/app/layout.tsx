import { Geist_Mono, Inter } from "next/font/google";

import "@mqdms/ui/globals.css";
import { getMessages, I18nProvider } from "@mqdms/i18n";
import { getLocale } from "@mqdms/i18n/server";
import { Toaster } from "@mqdms/ui/components/sonner";
import { TooltipProvider } from "@mqdms/ui/components/tooltip";
import { cn } from "@mqdms/ui/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
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
