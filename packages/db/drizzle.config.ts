import { env } from "@mqdms/env/server";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/*
 * `.env` dosyası repo kökünde durur; drizzle-kit ise paket dizininden
 * çalıştığı için yol açıkça veriliyor. `dotenv` mevcut ortam değişkenlerini
 * ezmez; kök scriptlerinin (`dotenv -e .env -- ...`) verdiği değerler önceliklidir.
 */
config({ path: "../../.env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/**/*.ts",
  out: "./drizzle",

  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
