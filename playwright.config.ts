import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://ci:ci@127.0.0.1:54329/ci?schema=public";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "ci-test-secret-minimum-32-chars-long",
      DEMO_USERNAME: process.env.DEMO_USERNAME ?? "e2e-admin",
      DEMO_PASSWORD: process.env.DEMO_PASSWORD ?? "e2e-test-pass-2026",
      DEMO_USER_ROLE: process.env.DEMO_USER_ROLE ?? "Administrateur",
      ALLOW_DEV_LOGIN: "true",
      DEV_USER_EMAIL: "admin@local.dev",
      DEV_USER_ROLE: "Administrateur",
      NODE_ENV: "production",
    },
  },
});
