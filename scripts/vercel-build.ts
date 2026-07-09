import { execSync } from "child_process";

execSync("npx prisma generate", { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL détectée — application du schéma Prisma...");
  execSync("npx prisma db push", { stdio: "inherit" });
} else {
  console.warn(
    "DATABASE_URL absente — schéma non appliqué. Ajoutez une base Postgres dans Vercel Storage."
  );
}

execSync("npx next build", { stdio: "inherit" });
