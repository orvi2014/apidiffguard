import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const stamp = Date.now();
const email = `owner.e2e+${stamp}@apidiffguard.dev`;
const password = `Adg!${randomBytes(6).toString("hex")}9x`;
const name = "E2E Owner";
const workspace = "E2E Production Workspace";
const endpointName = `HTTPBin JSON ${stamp}`;
const endpointUrl = "https://httpbin.org/json";
const credsPath = "e2e-artifacts/owner-credentials.json";

test.describe.configure({ mode: "serial" });

test("real signup → endpoint → baseline → check", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();

  await page.goto("/register");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#workspace").fill(workspace);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL(/\/(dashboard|endpoints)/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/(dashboard|endpoints)/);

  await page.goto("/endpoints/new");
  await page.locator("#name").fill(endpointName);
  await page.locator("#url").fill(endpointUrl);
  await page.getByRole("button", { name: "Create endpoint" }).click();
  await page.waitForURL(/\/endpoints\/[0-9a-f-]+/, { timeout: 60_000 });

  const endpointPath = new URL(page.url()).pathname;
  expect(endpointPath).toMatch(/\/endpoints\/[0-9a-f-]+/);

  await page.getByRole("button", { name: /Capture baseline/i }).click();
  await expect(page.getByText(/Baseline v\d+ captured/i)).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: /Run check/i }).click();
  await expect(
    page.getByText(/Check passed|breaking|warning|drift/i).first()
  ).toBeVisible({ timeout: 60_000 });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByText(endpointName).first()).toBeVisible();

  mkdirSync("e2e-artifacts", { recursive: true });
  const payload = {
    baseURL: process.env.E2E_BASE_URL ?? "https://apidiffguard.vercel.app",
    email,
    password,
    name,
    workspace,
    endpointName,
    endpointUrl,
    endpointPath,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(credsPath, JSON.stringify(payload, null, 2));
  writeFileSync(
    "e2e-artifacts/owner-credentials.txt",
    [
      `Base URL: ${payload.baseURL}`,
      `Email:    ${email}`,
      `Password: ${password}`,
      `Workspace:${workspace}`,
      `Endpoint: ${endpointName}`,
      `URL:      ${endpointUrl}`,
      `Path:     ${endpointPath}`,
      "",
      `Sign in:  ${payload.baseURL}/login`,
    ].join("\n")
  );
});

test("login with the created account still works", async ({ page, context }) => {
  test.skip(!existsSync(credsPath), "credentials missing from signup test");
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
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
});
