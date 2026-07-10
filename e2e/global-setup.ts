import { execSync } from "child_process";
import "dotenv/config";

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || process.env.SKIP_E2E_DB === "1") return;

  execSync("npx prisma db push", {
    stdio: "inherit",
    env: process.env,
  });

  execSync("npx tsx scripts/setup-local.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
