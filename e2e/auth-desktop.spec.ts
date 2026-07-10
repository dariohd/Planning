import { test, expect } from "@playwright/test";

const e2eUser = process.env.DEMO_USERNAME ?? "e2e-admin";
const e2ePass = process.env.DEMO_PASSWORD ?? "e2e-test-pass-2026";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("planning-onboarding-dismissed", "1");
  });
  await page.goto("/login");
  await page.getByLabel("Identifiant").fill(e2eUser);
  await page.getByLabel("Mot de passe").fill(e2ePass);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/desktop/, { timeout: 15_000 });
}

test("connexion admin et navigation bureau", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("button", { name: "Équipe" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Individuel" })).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: "Guide" })).toBeVisible();
});

test("guide modal s'ouvre", async ({ page }) => {
  await loginAsAdmin(page);
  await page.locator("header").getByRole("button", { name: "Guide" }).click();
  await expect(page.getByRole("heading", { name: "Mode d'emploi" })).toBeVisible();
  await page.getByRole("button", { name: "J'ai compris" }).click();
});

test("vue mobile accessible", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Mobile" }).click();
  await expect(page).toHaveURL(/\/mobile/);
});
