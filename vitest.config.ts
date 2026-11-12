import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],

    /*
     * Testler ortam değişkeni doğrulayan modülleri import edebilir. Gerçek
     * değerler gerekmez; modüller yalnızca URL biçimini doğrular.
     */
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_BUSINESS_APP_URL: "http://localhost:3001",
    },
  },
});
