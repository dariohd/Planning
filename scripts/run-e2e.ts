import { spawnSync } from "child_process";
import net from "net";
import path from "path";
import EmbeddedPostgres from "embedded-postgres";

const E2E_PORT = Number(process.env.E2E_PG_PORT ?? 54329);
const E2E_USER = "ci";
const E2E_PASSWORD = "ci";
const E2E_DB = "ci";

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function buildDatabaseUrl(port: number): string {
  return `postgresql://${E2E_USER}:${E2E_PASSWORD}@127.0.0.1:${port}/${E2E_DB}?schema=public`;
}

async function ensureEmbeddedPostgres(): Promise<EmbeddedPostgres | null> {
  if (process.env.SKIP_E2E_DB === "1") return null;

  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl && !configuredUrl.includes("localhost:5432") && !configuredUrl.includes("127.0.0.1:5432")) {
    console.log("E2E : utilisation de DATABASE_URL existante.");
    return null;
  }

  if (await canConnect(E2E_PORT)) {
    process.env.DATABASE_URL = buildDatabaseUrl(E2E_PORT);
    console.log(`E2E : PostgreSQL déjà actif sur le port ${E2E_PORT}.`);
    return null;
  }

  const dataDir = path.join(process.cwd(), ".e2e-data", "pg");
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: E2E_USER,
    password: E2E_PASSWORD,
    port: E2E_PORT,
    persistent: true,
  });

  console.log(`E2E : démarrage PostgreSQL embarqué (port ${E2E_PORT})…`);
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(E2E_DB);
  } catch {
    /* base déjà créée */
  }

  process.env.DATABASE_URL = buildDatabaseUrl(E2E_PORT);
  return pg;
}

async function main() {
  let pg: EmbeddedPostgres | null = null;
  try {
    pg = await ensureEmbeddedPostgres();
    const args = process.argv.slice(2);
    const result = spawnSync("npx", ["playwright", "test", ...args], {
      stdio: "inherit",
      env: { ...process.env },
      shell: true,
    });
    process.exit(result.status ?? 1);
  } finally {
    if (pg) {
      console.log("E2E : arrêt PostgreSQL embarqué.");
      await pg.stop();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
