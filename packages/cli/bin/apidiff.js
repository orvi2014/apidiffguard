#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { compareJson, summarizeChanges } from "@apidiffguard/diff";

const VERSION = "0.2.0";

function printHelp() {
  console.log(`apidiff ${VERSION} — APIDiffGuard CLI

Usage:
  apidiff check --baseline <file> --current <file> [--fail-on breaking|warning|info]
  apidiff check --baseline <file> --url <https://...> [--fail-on ...]
  apidiff --version
  apidiff --help

Exit codes:
  0  no changes at or above --fail-on severity
  1  failing severity found
  2  usage / runtime error
`);
}

function parseArgs(argv) {
  const out = {
    cmd: null,
    baseline: null,
    current: null,
    url: null,
    failOn: "breaking",
    json: false,
    help: false,
    version: false,
  };
  const args = [...argv];
  if (args[0] && !args[0].startsWith("-")) {
    out.cmd = args.shift();
  }
  while (args.length) {
    const a = args.shift();
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--version" || a === "-v") out.version = true;
    else if (a === "--baseline" || a === "--old") out.baseline = args.shift() ?? null;
    else if (a === "--current" || a === "--new") out.current = args.shift() ?? null;
    else if (a === "--url") out.url = args.shift() ?? null;
    else if (a === "--fail-on") out.failOn = (args.shift() ?? "breaking").toLowerCase();
    else if (a === "--json") out.json = true;
    else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function readJsonFile(path) {
  const abs = resolve(path);
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`);
  try {
    return JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${abs}: ${err instanceof Error ? err.message : err}`);
  }
}

async function fetchJson(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed.");
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `URL did not return JSON (HTTP ${res.status}). Body starts with: ${text.slice(0, 120)}`
    );
  }
}

const RANK = { info: 0, warning: 1, breaking: 2 };

async function runCheck(opts) {
  if (!opts.baseline) throw new Error("--baseline <file> is required");
  if (!opts.current && !opts.url) {
    throw new Error("Provide --current <file> or --url <https://...>");
  }
  if (opts.current && opts.url) {
    throw new Error("Use either --current or --url, not both");
  }
  if (!["breaking", "warning", "info"].includes(opts.failOn)) {
    throw new Error("--fail-on must be breaking, warning, or info");
  }

  const baseline = readJsonFile(opts.baseline);
  const current = opts.url
    ? await fetchJson(opts.url)
    : readJsonFile(opts.current);

  const changes = compareJson(baseline, current);
  const summary = summarizeChanges(changes);
  const threshold = RANK[opts.failOn];
  const failing = changes.filter((c) => RANK[c.severity] >= threshold);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          summary,
          failOn: opts.failOn,
          failed: failing.length > 0,
          changes,
        },
        null,
        2
      )
    );
  } else {
    console.log(
      `breaking=${summary.breakingCount} warning=${summary.warningCount} info=${summary.infoCount}`
    );
    for (const c of changes.slice(0, 50)) {
      const tag = c.severity.toUpperCase().padEnd(8);
      console.log(`${tag} ${c.type.padEnd(13)} ${c.path}`);
    }
    if (changes.length > 50) {
      console.log(`… ${changes.length - 50} more`);
    }
    if (failing.length) {
      console.log(
        `\nFailed: ${failing.length} change(s) at or above ${opts.failOn}.`
      );
    } else {
      console.log(`\nPassed: no changes at or above ${opts.failOn}.`);
    }
  }

  return failing.length ? 1 : 0;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    printHelp();
    process.exit(2);
  }

  if (opts.version) {
    console.log(VERSION);
    return;
  }
  if (opts.help || !opts.cmd) {
    printHelp();
    return;
  }

  if (opts.cmd !== "check") {
    console.error(`Unknown command: ${opts.cmd}`);
    printHelp();
    process.exit(2);
  }

  try {
    const code = await runCheck(opts);
    process.exit(code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
