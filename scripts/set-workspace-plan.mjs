#!/usr/bin/env node
/**
 * Set a workspace's plan directly.
 *
 * `workspaces.plan` is otherwise only ever written by the Stripe and Polar
 * webhooks, which is right for self-serve tiers — but `team` is contact-only
 * and has no checkout behind it, so granting one has always meant hand-written
 * SQL. This is that SQL, with the plan name validated and the workspace named
 * back to you before it writes.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the
 * environment or an env file:
 *
 *   vercel env pull .env.production.local --environment=production
 *   node scripts/set-workspace-plan.mjs --env .env.production.local --list
 *   node scripts/set-workspace-plan.mjs --env .env.production.local \
 *     --workspace acme --plan team --apply
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PLANS = ["free", "starter", "pro", "team"];

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

const APPLY = process.argv.includes("--apply");
const LIST = process.argv.includes("--list");
const ENV_FILE = arg("--env");
const TARGET = arg("--workspace");
const PLAN = arg("--plan");

if (ENV_FILE) {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --env <file>."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: workspaces, error } = await supabase
  .from("workspaces")
  .select("id, name, slug, plan")
  .order("created_at", { ascending: true });

if (error) {
  console.error("Could not read workspaces:", error.message);
  process.exit(1);
}

if (LIST || !TARGET) {
  if (!workspaces?.length) {
    console.log("No workspaces exist yet. Sign in once to create one.");
    process.exit(0);
  }
  console.log("slug".padEnd(24), "plan".padEnd(8), "id");
  for (const w of workspaces) {
    console.log(String(w.slug).padEnd(24), String(w.plan).padEnd(8), w.id);
  }
  if (!TARGET) process.exit(0);
  process.exit(0);
}

const workspace = workspaces.find((w) => w.slug === TARGET || w.id === TARGET);
if (!workspace) {
  console.error(`No workspace matches "${TARGET}". Run with --list to see them.`);
  process.exit(1);
}

if (!PLAN || !PLANS.includes(PLAN)) {
  console.error(`--plan must be one of: ${PLANS.join(", ")}`);
  process.exit(1);
}

console.log(`${workspace.name} (${workspace.slug})`);
console.log(`  ${workspace.plan} → ${PLAN}`);

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

const { error: updateError } = await supabase
  .from("workspaces")
  .update({ plan: PLAN })
  .eq("id", workspace.id);

if (updateError) {
  console.error("Update failed:", updateError.message);
  process.exit(1);
}

console.log(`\nPlan set to ${PLAN}.`);
if (PLAN === "team") {
  console.log(
    "Note: a later Stripe or Polar webhook for this workspace will overwrite it."
  );
}
