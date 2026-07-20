import { test, expect } from "@playwright/test";

const lecteurUser = "e2e-lecteur";
const deniedUser = "e2e-denied";
const e2ePass = process.env.DEMO_PASSWORD ?? "e2e-test-pass-2026";

async function loginAs(page: import("@playwright/test").Page, username: string, password: string) {
  await page.addInitScript(() => {
    localStorage.setItem("planning-onboarding-dismissed", "1");
  });
  await page.goto("/login");
  await page.getByLabel(/Identifiant|Username|Utilizador/i).fill(username);
  await page.getByLabel(/Mot de passe|Password|Palavra-passe/i).fill(password);
  await page.getByRole("button", { name: /Se connecter|Sign in|Entrar/i }).click();
}

test("lecteur : planning en lecture seule", async ({ page }) => {
  await loginAs(page, lecteurUser, e2ePass);
  await expect(page).toHaveURL(/\/desktop/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Équipe|Team|Equipa/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("header")).toContainText(/lecture seule|read only|somente leitura/i);
  await expect(page.getByRole("button", { name: /Modification groupée|Mass update|Atualização em massa/i })).toHaveCount(0);
  await expect(page.locator("header").getByRole("button", { name: /Paramètres|Settings|Configurações/i })).toHaveCount(0);
});

test("non autorisé : écran d'accès refusé", async ({ page }) => {
  await loginAs(page, deniedUser, e2ePass);
  await expect(page).toHaveURL(/\/desktop/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Non autorisé|Not authorized|Não autorizado/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: /Déconnexion|Sign out|Sair/i })).toBeVisible();
});
