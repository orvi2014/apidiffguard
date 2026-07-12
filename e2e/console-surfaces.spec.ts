import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const credsPath = "e2e-artifacts/owner-credentials.json";

function loadCreds() {
  test.skip(!existsSync(credsPath), "Run full production-flow first");
  return JSON.parse(readFileSync(credsPath, "utf8")) as {
    email: string;
    password: string;
    endpointName?: string;
    endpointPath?: string;
  };
}

async function signIn(page: Page) {
  const creds = loadCreds();
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|endpoints)/, { timeout: 60_000 });
  return creds;
}

test.describe("console surfaces", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard overview controls and quick actions", async ({ page }) => {
    const creds = await signIn(page);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Overview", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Healthy", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Breaking", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Warnings", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Checks today", { exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Endpoints" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick actions" })).toBeVisible();

    await expect(page.getByRole("link", { name: /^Endpoint$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Import OpenAPI/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "View all" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Capture baseline" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create endpoint" })).toBeVisible();

    if (creds.endpointName) {
      await expect(page.getByText(creds.endpointName).first()).toBeVisible();
    }

    await page.getByRole("link", { name: "View all" }).click();
    await expect(page).toHaveURL(/\/endpoints/);
  });

  test("endpoints list and detail action buttons", async ({ page }) => {
    const creds = await signIn(page);
    await page.goto("/endpoints");

    await expect(page.getByRole("heading", { name: "Endpoints" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Import" })).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "New endpoint" })
    ).toBeVisible();

    if (creds.endpointName) {
      await page.getByRole("main").getByText(creds.endpointName).first().click();
      await expect(page).toHaveURL(/\/endpoints\//);
      await expect(page.getByRole("button", { name: /Capture baseline/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Run check/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Delete endpoint/i })).toBeVisible();
    }
  });

  test("alerts page + configure channels flow", async ({ page }) => {
    await signIn(page);
    await page.goto("/alerts");

    await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
    await expect(page.getByText("Channels", { exact: true })).toBeVisible();
    await expect(page.getByText("Sent today", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test notification" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Configure channels" }).first()
    ).toBeVisible();

    await page.getByRole("link", { name: "Configure channels" }).first().click();
    await expect(page).toHaveURL(/\/alerts\/channels/);
    await expect(
      page.getByRole("heading", { name: "Alert channels" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add channel" })).toBeVisible();
    await expect(page.getByLabel("Channel", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Destination", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add channel" })).toBeVisible();

    // Clear leftover e2e channels from prior failed runs
    for (let i = 0; i < 10; i++) {
      const remove = page.getByRole("button", { name: "Remove" }).first();
      if (!(await remove.isVisible().catch(() => false))) break;
      const before = await page.getByRole("button", { name: "Remove" }).count();
      await remove.click();
      await expect
        .poll(async () => page.getByRole("button", { name: "Remove" }).count(), {
          timeout: 30_000,
        })
        .toBeLessThan(before);
    }

    const destination = `e2e-alerts-${Date.now()}@apidiffguard.dev`;
    await page.getByLabel("Channel", { exact: true }).selectOption("EMAIL");
    await page.getByLabel("Minimum severity", { exact: true }).selectOption("WARNING");
    await page.getByLabel("Destination", { exact: true }).fill(destination);
    await page.getByRole("button", { name: "Add channel" }).click();
    await page.waitForURL(/\/alerts\/channels\?created=1|\/alerts\/channels/, {
      timeout: 30_000,
    });
    await expect(page.getByRole("status")).toContainText(/Channel added/i);
    await expect(page.getByText(destination)).toBeVisible();
    await expect(page.getByRole("button", { name: "Disable" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" }).first()).toBeVisible();

    await page.goto("/alerts");
    await expect(page.getByRole("button", { name: "Test notification" })).toBeEnabled();
    await page.getByRole("button", { name: "Test notification" }).click();
    await page.waitForURL(/\/alerts\?tested=1/, { timeout: 30_000 });
    await expect(page.getByRole("status")).toContainText(/Test notification/i);
    await expect(
      page.getByText(/Test notification from APIDiffGuard console/i)
    ).toBeVisible();

    // Cleanup channel so reruns stay tidy
    await page.goto("/alerts/channels");
    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(
      page.getByText(/Channel removed|No channels yet/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("schedules page controls", async ({ page }) => {
    await signIn(page);
    await page.goto("/schedules");

    await expect(page.getByRole("heading", { name: "Schedules" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add schedule" })).toBeVisible();
    await expect(
      page.getByText(/No schedules yet|Frequency|Endpoint/i).first()
    ).toBeVisible();
  });

  test("diffs surface loads", async ({ page }) => {
    await signIn(page);
    await page.goto("/diff/latest");
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: /Diff|Latest/i })
        .or(page.getByText(/Go to endpoints|No diffs|baseline/i))
        .first()
    ).toBeVisible();
  });
});
