import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const credsPath = "e2e-artifacts/owner-credentials.json";

test("billing: authenticated upgrade stays signed in", async ({
  page,
  context,
}) => {
  test.skip(!existsSync(credsPath), "Run full production-flow first");
  const creds = JSON.parse(readFileSync(credsPath, "utf8")) as {
    email: string;
    password: string;
  };

  await context.clearCookies();
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|endpoints)/, { timeout: 60_000 });

  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByText(/You are on the/i)).toBeVisible();

  await page.getByRole("link", { name: "Change plan" }).click();
  await expect(page.locator("#plans")).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/billing/);

  // Stay authenticated on pricing; CTAs are upgrade/billing, not register.
  await page.goto("/pricing");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start Pro/i })).toHaveCount(0);

  const upgrade = page.getByRole("button", { name: /Upgrade to Pro/i });
  const current = page.getByRole("button", { name: "Current plan" });
  const stripeMissing = page.getByRole("button", { name: /Open billing|Stripe not configured/i });

  if (await upgrade.count()) {
    // Clicking should hit checkout API; without Stripe keys we get an inline error,
    // with keys we navigate off-site to Stripe — either proves auth-aware CTA.
    await upgrade.first().click();
    await page.waitForTimeout(2500);
    const onStripe = page.url().includes("stripe.com");
    const onBilling = page.url().includes("/settings/billing");
    const alert = page.getByRole("alert");
    expect(onStripe || onBilling || (await alert.count()) > 0).toBeTruthy();
  } else {
    await expect(current.or(stripeMissing).first()).toBeVisible();
  }
});
