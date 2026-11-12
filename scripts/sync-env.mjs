import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootEnv = resolve(process.cwd(), ".env");

/*
 * Her web deploy kendi dizininde `.env` bekler: Next.js build sırasında
 * `NEXT_PUBLIC_*` değişkenlerini işler ve uygulama kendi dizinindeki
 * `.env` dosyasını okur.
 */
const webApps = ["apps/auth", "apps/app"];

for (const app of webApps) {
  await copyFile(rootEnv, resolve(process.cwd(), app, ".env"));
}

console.log(`Synced .env -> ${webApps.join(", ")}`);
