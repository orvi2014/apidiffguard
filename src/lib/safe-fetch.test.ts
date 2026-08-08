import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePinnedAddress, type HostResolver } from "@/lib/safe-fetch";

const resolverReturning = (
  ...addresses: Array<[string, number]>
): HostResolver => {
  return async () => addresses.map(([address, family]) => ({ address, family }));
};

describe("resolvePinnedAddress", () => {
  it("pins a public A record", async () => {
    const pinned = await resolvePinnedAddress(
      "api.example.com",
      resolverReturning(["93.184.216.34", 4]),
    );
    assert.deepEqual(pinned, { address: "93.184.216.34", family: 4 });
  });

  it("pins a public AAAA record", async () => {
    const pinned = await resolvePinnedAddress(
      "api.example.com",
      resolverReturning(["2606:2800:220:1:248:1893:25c8:1946", 6]),
    );
    assert.equal(pinned.family, 6);
  });

  it("rejects a name that resolves to loopback", async () => {
    await assert.rejects(
      resolvePinnedAddress("evil.example.com", resolverReturning(["127.0.0.1", 4])),
      /private or reserved/,
    );
  });

  it("rejects a name that resolves to the cloud metadata address", async () => {
    await assert.rejects(
      resolvePinnedAddress(
        "evil.example.com",
        resolverReturning(["169.254.169.254", 4]),
      ),
      /private or reserved/,
    );
  });

  it("rejects RFC1918 space", async () => {
    for (const address of ["10.0.0.5", "172.16.4.4", "192.168.1.1"]) {
      await assert.rejects(
        resolvePinnedAddress("evil.example.com", resolverReturning([address, 4])),
        /private or reserved/,
        `${address} should be refused`,
      );
    }
  });

  it("rejects IPv6 loopback and link-local", async () => {
    for (const address of ["::1", "fe80::1", "fc00::1"]) {
      await assert.rejects(
        resolvePinnedAddress("evil.example.com", resolverReturning([address, 6])),
        /private or reserved/,
        `${address} should be refused`,
      );
    }
  });

  it("rejects a mixed answer rather than picking the public address", async () => {
    // The rebinding payload: one good address to survive validation, one bad
    // address to win the connection race. Filtering would let the attacker
    // simply retry until the bad one is chosen first.
    await assert.rejects(
      resolvePinnedAddress(
        "evil.example.com",
        resolverReturning(["93.184.216.34", 4], ["169.254.169.254", 4]),
      ),
      /private or reserved/,
    );
  });

  it("rejects an empty answer", async () => {
    await assert.rejects(
      resolvePinnedAddress("nowhere.example.com", resolverReturning()),
      /Could not resolve/,
    );
  });

  it("surfaces resolver failure as a resolve error", async () => {
    await assert.rejects(
      resolvePinnedAddress("nowhere.example.com", async () => {
        throw new Error("ENOTFOUND");
      }),
      /Could not resolve/,
    );
  });

  it("accepts a public IP literal without consulting DNS", async () => {
    const pinned = await resolvePinnedAddress("8.8.8.8", async () => {
      throw new Error("resolver must not be called for a literal");
    });
    assert.deepEqual(pinned, { address: "8.8.8.8", family: 4 });
  });

  it("refuses a private IP literal", async () => {
    await assert.rejects(
      resolvePinnedAddress("127.0.0.1", async () => []),
      /cannot be requested/,
    );
  });

  it("unwraps bracketed IPv6 literals", async () => {
    const pinned = await resolvePinnedAddress("[2606:4700::1111]", async () => []);
    assert.deepEqual(pinned, { address: "2606:4700::1111", family: 6 });
  });
});
