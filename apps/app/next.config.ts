import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mqdms/ui"],

  /*
   * `forbidden()` yetki hatalarında 403 sayfası döndürmek için gereklidir.
   */
  experimental: {
    authInterrupts: true,
  },

  ...(process.env.NODE_ENV === "production" && {
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd(), "../../"),
  }),
};

export default nextConfig;
