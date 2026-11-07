import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootEnv = resolve(process.cwd(), ".env");
const webEnv = resolve(process.cwd(), "apps/auth/.env");

await copyFile(rootEnv, webEnv);

console.log("Synced .env -> apps/auth/.env");
