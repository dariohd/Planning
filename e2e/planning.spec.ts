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
  await expect(page.getByRole("button", { name: "Équipe" })).toBeVisible({ timeout: 30_000 });
}

test("édition d'une cellule de présence", async ({ page }) => {
  await loginAsAdmin(page);

  const cell = page.locator("td.cursor-pointer").first();
  await expect(cell).toBeVisible({ timeout: 30_000 });
  await cell.click();

  await expect(page.getByRole("dialog").getByText("Présence")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "CP", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });

  await expect(page.locator("td.cursor-pointer").filter({ hasText: "CP" }).first()).toBeVisible();
});

test("paramètres accès : ajouter un utilisateur lecteur", async ({ page }) => {
  await loginAsAdmin(page);

  await page.locator("header").getByRole("button", { name: "Paramètres" }).click();
  await expect(page.getByRole("heading", { name: "Paramètres" })).toBeVisible();

  await page.getByRole("tab", { name: "Accès" }).click();
  const email = `e2e-lecteur-${Date.now()}@test.local`;
  await page.getByPlaceholder("email@domaine.com").fill(email);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
});
