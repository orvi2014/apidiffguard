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
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|endpoints)/, { timeout: 60_000 });
  return creds;
}

async function assertVisible(
  page: Page,
  role: Parameters<Page["getByRole"]>[0],
  name: string | RegExp
) {
  await expect(page.getByRole(role, { name }).first()).toBeVisible();
}

test.describe("all buttons — marketing (signed out)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("home CTAs are present and navigable", async ({ page }) => {
    await page.goto("/");
    await assertVisible(page, "link", "Skip to content");
    await assertVisible(page, "link", "Sign in");
    await assertVisible(page, "link", "Start free");
    await assertVisible(page, "link", /Start monitoring/i);
    await assertVisible(page, "link", /Free JSON Diff/i);
    await assertVisible(page, "link", /View pricing/i);

    await page.getByRole("link", { name: /Free JSON Diff/i }).first().click();
    await expect(page).toHaveURL(/\/tools\/json-diff/);
  });

  test("mobile menu open/close + nav links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Open menu" }).click();
    const mobile = page.getByRole("navigation", { name: "Mobile" });
    await expect(mobile).toBeVisible();
    for (const label of ["Product", "About", "Tools", "Blog", "Pricing", "Docs", "Sign in"]) {
      await expect(mobile.getByRole("link", { name: label })).toBeVisible();
    }
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(mobile).toHaveCount(0);
  });

  test("pricing plan CTAs", async ({ page }) => {
    await page.goto("/pricing");
    await assertVisible(page, "link", "Start free");
    await assertVisible(page, "link", /Start Starter/i);
    await assertVisible(page, "link", /Start Pro/i);
    await assertVisible(page, "link", "Talk to us");
  });

  test("tools page + json tooling buttons", async ({ page }) => {
    await page.goto("/tools");
    await assertVisible(page, "link", /JSON Diff/i);
    await assertVisible(page, "link", /JSON Formatter/i);
    await assertVisible(page, "link", /JSON Validator/i);
    await assertVisible(page, "link", /Try APIDiffGuard free|Start free|View pricing/i);

    await page.goto("/tools/json-diff");
    await page.getByRole("button", { name: "Load sample" }).click();
    await page.getByRole("button", { name: "Clear both" }).click();

    await page.goto("/tools/json-formatter");
    await page.getByRole("button", { name: "Pretty print" }).click();
    await page.getByRole("button", { name: "Minify" }).click();

    await page.goto("/tools/json-validator");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("auth pages expose primary buttons", async ({ page }) => {
    await page.goto("/login");
    await assertVisible(page, "button", "Sign in");
    await assertVisible(page, "button", /Continue with GitHub/i);
    await assertVisible(page, "link", /Forgot/i);
    await assertVisible(page, "link", /Create one|Sign up|Register/i);

    await page.goto("/register");
    await assertVisible(page, "button", "Create account");
    await assertVisible(page, "button", /Continue with GitHub/i);
    await assertVisible(page, "link", "Sign in");
  });

  test("marketing content pages load with header CTAs", async ({ page }) => {
    for (const path of ["/about", "/blog", "/changelog", "/privacy", "/terms"]) {
      await page.goto(path);
      await assertVisible(page, "link", "Start free");
      await assertVisible(page, "link", "Sign in");
    }
    await page.goto("/docs");
    await assertVisible(page, "link", /Open console/i);
  });
});

test.describe("all buttons — console (signed in)", () => {
  test("console nav + settings + billing controls", async ({ page, context }) => {
    await context.clearCookies();
    const creds = await signIn(page);

    // Shell nav
    const consoleNav = page.getByRole("navigation", { name: "Console" });
    for (const label of ["Overview", "Endpoints", "Diffs", "Alerts", "Schedules"]) {
      await expect(consoleNav.getByRole("link", { name: label })).toBeVisible();
    }
    await assertVisible(page, "link", "Settings");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();

    // Dashboard CTAs
    await page.goto("/dashboard");
    await assertVisible(page, "heading", "Overview");
    for (const name of [/Endpoint/i, /Import OpenAPI/i]) {
      await expect(page.getByRole("link", { name }).first()).toBeVisible();
    }

    // Endpoints list
    await page.goto("/endpoints");
    await assertVisible(page, "link", /New endpoint|Import/i);

    // New endpoint form buttons (do not submit)
    await page.goto("/endpoints/new");
    await assertVisible(page, "button", "Create endpoint");
    await assertVisible(page, "link", /Cancel|Endpoints/i);

    // Endpoint detail mutation buttons — assert present, do not click delete
    if (creds.endpointPath) {
      await page.goto(creds.endpointPath);
      await assertVisible(page, "button", /Capture baseline/i);
      await assertVisible(page, "button", /Run check/i);
      // Prefer aria-label; fall back to danger icon button
      const del = page.getByRole("button", { name: /Delete/i });
      if (await del.count()) {
        await expect(del.first()).toBeVisible();
      } else {
        await expect(page.locator("button.text-danger, button[class*='destructive']").first()).toBeVisible();
      }
    }

    // Diff / alerts / schedules
    await page.goto("/diff/latest");
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/alerts");
    await assertVisible(page, "button", /Test notification/i);
    await assertVisible(page, "button", /Configure channels/i);

    await page.goto("/schedules");
    await assertVisible(page, "link", /Add schedule/i);
    await assertVisible(page, "button", /Create schedule|Add schedule/i);

    // Settings sections
    await page.goto("/settings");
    const settingsNav = page.getByRole("navigation", { name: "Settings" });
    for (const label of ["General", "Workspace", "Billing", "API tokens", "Profile"]) {
      await expect(settingsNav.getByRole("link", { name: label })).toBeVisible();
    }
    await assertVisible(page, "button", /Save changes/i);

    await page.goto("/settings/profile");
    await assertVisible(page, "button", /Save profile/i);

    await page.goto("/settings/workspace");
    await assertVisible(page, "button", /Update workspace/i);

    await page.goto("/settings/tokens");
    await assertVisible(page, "button", /Create token/i);
    await expect(page.getByRole("button", { name: /Revoke/i }).first()).toBeVisible();

    await page.goto("/settings/billing");
    await assertVisible(page, "link", "Change plan");
    await assertVisible(page, "button", /Manage payment/i);
    // Plan cards: current / upgrade / talk to us / stripe not configured
    const planActions = page.locator("#plans").getByRole("button");
    await expect(planActions.first()).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Current plan|Upgrade to|Downgrade via portal|Ask an admin|Stripe not configured|Talk to us/i,
      }).first()
    ).toBeVisible();

    // Pricing while signed in should show Dashboard, not Start Pro register CTA
    await page.goto("/pricing");
    await assertVisible(page, "link", "Dashboard");
    await expect(page.getByRole("link", { name: /Start Pro/i })).toHaveCount(0);

    // Back to console for nav clicks
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true })
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Console" });
    await nav.getByRole("link", { name: "Endpoints" }).click();
    await expect(page).toHaveURL(/\/endpoints/);
    await nav.getByRole("link", { name: "Diffs" }).click();
    await expect(page).toHaveURL(/\/diff/);
    await nav.getByRole("link", { name: "Alerts" }).click();
    await expect(page).toHaveURL(/\/alerts/);
    await nav.getByRole("link", { name: "Schedules" }).click();
    await expect(page).toHaveURL(/\/schedules/);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
