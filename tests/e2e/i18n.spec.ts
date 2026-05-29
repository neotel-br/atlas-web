import { test, expect } from "@playwright/test";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@neotel.com.br";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page).toHaveURL(/\/pt$/);
}

test("locale switch pt -> en keeps the docs route", async ({ page }) => {
  await login(page);
  await page.goto("/pt/docs/processes/onboarding");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/docs\/processes\/onboarding/);
  await expect(page.getByText(/onboarding process|Steps to onboard/i)).toBeVisible();
});
