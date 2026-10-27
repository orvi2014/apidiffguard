#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../src/server.js";

const VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8")
).version;

const arg = process.argv[2];
if (arg === "--version" || arg === "-v") {
  console.log(VERSION);
  process.exit(0);
}
if (arg === "--help" || arg === "-h") {
  console.log(`apidiffguard-mcp ${VERSION} — APIDiffGuard MCP server (stdio)

Add it to an MCP client, for example:
  claude mcp add apidiffguard -- npx -y @apidiffguard/mcp

Environment:
  APIDIFFGUARD_TOKEN  Workspace API token (adg_live_…). Enables the workspace
                      tools; without it only the local tools are offered.
  APIDIFFGUARD_URL    Base URL of a self-hosted instance.
                      Default: https://apidiffguard.com
`);
  process.exit(0);
}

// stdout carries the protocol, so anything human-readable goes to stderr.
const server = createServer({ version: VERSION });
await server.connect(new StdioServerTransport());
console.error(
  `apidiffguard-mcp ${VERSION} ready (${process.env.APIDIFFGUARD_TOKEN ? "workspace tools on" : "local tools only"})`
);
