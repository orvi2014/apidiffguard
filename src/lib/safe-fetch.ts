import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";
import {
  isBlockedHost,
  MAX_REDIRECTS,
  parseAndAssertPublicUrl,
} from "@/lib/safe-url";

/**
 * Outbound fetch with the resolved IP pinned for the life of the connection.
 *
 * Validating `new URL(...).hostname` against a blocklist only proves the *name*
 * looked safe at validation time. An attacker who controls the zone can answer
 * the first lookup with a public address and the second — the one the TCP
 * connection actually uses — with 169.254.169.254. That is DNS rebinding, and
 * a name-only guard cannot see it.
 *
 * So we resolve the name ourselves, reject the request unless *every* returned
 * address is publicly routable, and then force the socket to the address we
 * checked. Overriding `lookup` rather than rewriting the URL to an IP literal
 * keeps SNI and the Host header pointed at the original hostname, so virtual
 * hosts and TLS still work.
 */

export type PinnedAddress = { address: string; family: 4 | 6 };

/** Injectable so the rebinding cases can be tested without a live resolver. */
export type HostResolver = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

const systemResolver: HostResolver = (hostname) =>
  dnsLookup(hostname, { all: true });

function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

/**
 * Resolve `hostname` and assert every address it maps to is public.
 *
 * A name that resolves to both a public and a private address is rejected
 * outright rather than filtered down to the public one: there is no legitimate
 * reason for a monitored API to advertise a loopback or link-local address, and
 * filtering would let a rebinding attacker keep retrying until they win the
 * race for whichever address we happened to pick.
 */
export async function resolvePinnedAddress(
  hostname: string,
  resolve: HostResolver = systemResolver,
): Promise<PinnedAddress> {
  const bare = stripBrackets(hostname);

  const literalFamily = isIP(bare);
  if (literalFamily) {
    if (isBlockedHost(bare)) {
      throw new Error("That host cannot be requested from the server.");
    }
    return { address: bare, family: literalFamily as 4 | 6 };
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await resolve(bare);
  } catch {
    throw new Error(`Could not resolve ${bare}.`);
  }

  if (!records.length) {
    throw new Error(`Could not resolve ${bare}.`);
  }

  for (const record of records) {
    if (isBlockedHost(record.address)) {
      throw new Error(
        "That host resolves to a private or reserved address and cannot be requested from the server.",
      );
    }
  }

  const chosen = records[0]!;
  return { address: chosen.address, family: chosen.family === 6 ? 6 : 4 };
}

// Agents pool keep-alive sockets, so building one per request would leak
// connections and defeat pooling. Key on the pinned address: the address is the
// thing we validated, and Host/SNI still come from the request URL.
const MAX_CACHED_AGENTS = 64;
const agents = new Map<string, Agent>();

function dispatcherFor(pinned: PinnedAddress): Agent {
  const key = `${pinned.family}:${pinned.address}`;
  const existing = agents.get(key);
  if (existing) {
    // Refresh recency for the eviction order below.
    agents.delete(key);
    agents.set(key, existing);
    return existing;
  }

  const agent = new Agent({
    connect: {
      // net.connect calls back with an array when `all` is set and a bare
      // (address, family) pair otherwise; undici has used both over time.
      lookup(
        _hostname: string,
        options: { all?: boolean },
        callback: (
          err: Error | null,
          address: string | Array<{ address: string; family: number }>,
          family?: number,
        ) => void,
      ) {
        if (options?.all) {
          callback(null, [{ address: pinned.address, family: pinned.family }]);
        } else {
          callback(null, pinned.address, pinned.family);
        }
      },
    },
  });

  if (agents.size >= MAX_CACHED_AGENTS) {
    const oldest = agents.keys().next().value;
    if (oldest !== undefined) {
      const stale = agents.get(oldest);
      agents.delete(oldest);
      void stale?.close().catch(() => undefined);
    }
  }

  agents.set(key, agent);
  return agent;
}

/**
 * Fetch with manual redirects so each hop is re-validated and re-pinned.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  let current = parseAndAssertPublicUrl(rawUrl);
  const timeoutMs = init.timeoutMs ?? 15000;
  let method = (init.method || "GET").toUpperCase();
  let body = init.body;
  const headers = new Headers(init.headers);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const pinned = await resolvePinnedAddress(current.hostname);

    const response = await fetch(current.toString(), {
      method,
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body,
      // Not in the DOM RequestInit type, but Node's fetch is undici's and reads
      // it. This is what actually pins the socket to the vetted address.
      dispatcher: dispatcherFor(pinned),
    } as RequestInit);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect without Location header.");
      }
      const next = new URL(location, current);
      // Re-runs the syntactic guard; the loop then re-resolves and re-pins, so
      // a redirect into private space is caught at both layers.
      parseAndAssertPublicUrl(next.toString());
      current = next;
      // Redirects become GET for 301/302/303; keep method for 307/308
      if ([301, 302, 303].includes(response.status) && method !== "HEAD") {
        method = "GET";
        body = undefined;
      }
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects.");
}
