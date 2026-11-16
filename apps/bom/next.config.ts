import type { NextConfig } from "next";

/**
 * BOM laboratuvarı.
 *
 * Veritabanı, oturum veya yetki yoktur; yalnızca arayüz paketi ve TanStack
 * kullanılır. Böylece BOM ağacı görünümü deploy edilmeden hızlıca
 * deneyebilir.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@mqdms/ui", "@mqdms/i18n"],
};

export default nextConfig;
