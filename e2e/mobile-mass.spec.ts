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

test("modification groupée : appliquer CP sur une personne", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("button", { name: "Équipe" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Modification groupée" }).click();
  await expect(page.getByRole("heading", { name: "Modification groupée" })).toBeVisible();

  const today = new Date().toISOString().slice(0, 10);
  await page.locator('input[type="date"]').first().fill(today);
  await page.locator('input[type="date"]').nth(1).fill(today);

  const firstCheckbox = page.locator('input[type="checkbox"]').first();
  await firstCheckbox.check();

  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByRole("heading", { name: "Modification groupée" })).toBeHidden({ timeout: 10_000 });
});

test("mobile : chargement équipe et saisie rapide", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/mobile");
  await expect(page.getByText("Équipe")).toBeVisible({ timeout: 30_000 });

  const presentBtn = page.getByRole("button", { name: "P", exact: true }).first();
  if (await presentBtn.isVisible().catch(() => false)) {
    await presentBtn.click();
  }
});
