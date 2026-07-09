import { test, expect } from "@playwright/test";

test("page de connexion affiche le formulaire", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Planning Présence" })).toBeVisible();
  await expect(page.getByLabel("Identifiant")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
});
