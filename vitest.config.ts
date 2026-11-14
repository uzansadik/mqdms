import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],

    /*
     * Testler ortam değişkeni doğrulayan modülleri import edebilir. Gerçek
     * değerler gerekmez; modüller yalnızca URL biçimini doğrular.
     *
     * `DATABASE_URL` yalnızca bağlantı havuzunun oluşturulması için gerekir:
     * sorgu üretimi (`.toSQL()`) veritabanına bağlanmaz.
     */
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_BUSINESS_APP_URL: "http://localhost:3001",
      APP_ENV: "test",
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/mqdms_test",
      STORAGE_BUCKET: "test-bucket",
      STORAGE_REGION: "auto",
      STORAGE_ACCESS_KEY_ID: "test-access-key",
      STORAGE_SECRET_ACCESS_KEY: "test-secret-key",
    },
  },
});
