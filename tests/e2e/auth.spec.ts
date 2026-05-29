import { test, expect } from "@playwright/test";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@neotel.com.br";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

test("unauthenticated docs access redirects to login", async ({ page }) => {
  await page.goto("/pt/docs");
  await expect(page).toHaveURL(/\/pt\/login/);
});

test("wrong credentials show error", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill("wrongpass");
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page.getByText(/credenciais inválidas|invalid credentials/i)).toBeVisible();
});

test("valid login reaches landing and docs", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page).toHaveURL(/\/pt$/);
  await page.goto("/pt/docs");
  await expect(page).not.toHaveURL(/login/);
});
