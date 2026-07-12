import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const credsPath = "e2e-artifacts/owner-credentials.json";

test("smoke: login + dashboard with saved owner account", async ({
  page,
  context,
}) => {
  test.skip(!existsSync(credsPath), "Run full production-flow first");
  const creds = JSON.parse(readFileSync(credsPath, "utf8")) as {
    email: string;
    password: string;
    endpointName?: string;
  };

  await context.clearCookies();
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|endpoints)/, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true })
  ).toBeVisible();
  if (creds.endpointName) {
    await expect(page.getByText(creds.endpointName).first()).toBeVisible();
  }
});
