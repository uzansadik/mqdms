import type { ReactNode } from "react";

type OauthLayoutProps = {
  children: ReactNode;
};

/**
 * OAuth provider akışının ekranları (organizasyon seçimi, onay) giriş
 * ekranıyla aynı kabuğu paylaşmaz; akış kendi yönlendirmesine devam etmelidir.
 */
export default function OauthLayout({ children }: OauthLayoutProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
