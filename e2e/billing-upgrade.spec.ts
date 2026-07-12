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

  // Change plan should stay in console (anchor), not dump to marketing alone.
  await page.getByRole("link", { name: "Change plan" }).click();
  await expect(page.locator("#plans")).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/billing/);

  const upgrade = page.getByRole("button", { name: /Upgrade to Pro|Switch to Pro/i });
  const currentPro = page.getByRole("button", { name: "Current plan" });
  if (await upgrade.count()) {
    await upgrade.first().click();
    await page.waitForURL(/\/settings\/billing\?upgraded=pro/, { timeout: 30_000 });
    await expect(page.getByRole("status")).toContainText(/Plan updated to Pro/i);
    await expect(page.getByText(/You are on the Pro plan/i)).toBeVisible();
  } else {
    await expect(currentPro.first()).toBeVisible();
  }

  // Public pricing while signed in should offer upgrade (not register).
  await page.goto("/pricing");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Current plan" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start Pro/i })).toHaveCount(0);
});
