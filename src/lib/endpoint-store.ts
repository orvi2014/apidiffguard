import type { Baseline, DiffResult, Endpoint, HealthStatus } from "./types";
import { updateImportedEndpoint } from "./imported-endpoints";

const BASELINES_KEY = "apidiffguard:baselines";
const DIFFS_KEY = "apidiffguard:diffs";
const BASELINES_EVENT = "apidiffguard:baselines";
const DIFFS_EVENT = "apidiffguard:diffs";

const emptyBaselines: Baseline[] = [];
const emptyDiffs: DiffResult[] = [];

let baselinesRaw: string | null = null;
let baselinesCache: Baseline[] = emptyBaselines;
let diffsRaw: string | null = null;
let diffsCache: DiffResult[] = emptyDiffs;

export function readStoredBaselines(): Baseline[] {
  if (typeof window === "undefined") return emptyBaselines;
  const raw = sessionStorage.getItem(BASELINES_KEY);
  if (raw === baselinesRaw) return baselinesCache;
  baselinesRaw = raw;
  baselinesCache = raw ? (JSON.parse(raw) as Baseline[]) : emptyBaselines;
  return baselinesCache;
}

export function subscribeBaselines(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === BASELINES_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(BASELINES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(BASELINES_EVENT, onChange);
  };
}

export function getServerBaselinesSnapshot() {
  return emptyBaselines;
}

export function readStoredDiffs(): DiffResult[] {
  if (typeof window === "undefined") return emptyDiffs;
  const raw = sessionStorage.getItem(DIFFS_KEY);
  if (raw === diffsRaw) return diffsCache;
  diffsRaw = raw;
  diffsCache = raw ? (JSON.parse(raw) as DiffResult[]) : emptyDiffs;
  return diffsCache;
}

export function subscribeDiffs(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === DIFFS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DIFFS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DIFFS_EVENT, onChange);
  };
}

export function getServerDiffsSnapshot() {
  return emptyDiffs;
}

export function getBaselinesForEndpoint(endpointId: string): Baseline[] {
  return readStoredBaselines()
    .filter((b) => b.endpointId === endpointId)
    .sort((a, b) => b.version - a.version);
}

export function getActiveBaseline(endpointId: string): Baseline | undefined {
  return getBaselinesForEndpoint(endpointId).find((b) => b.isActive);
}

export function saveBaseline(baseline: Baseline): Baseline {
  const existing = readStoredBaselines().map((b) =>
    b.endpointId === baseline.endpointId ? { ...b, isActive: false } : b
  );
  const next = [baseline, ...existing];
  const raw = JSON.stringify(next);
  sessionStorage.setItem(BASELINES_KEY, raw);
  baselinesRaw = raw;
  baselinesCache = next;
  window.dispatchEvent(new Event(BASELINES_EVENT));
  return baseline;
}

export function saveDiff(diff: DiffResult): DiffResult {
  const next = [diff, ...readStoredDiffs().filter((d) => d.id !== diff.id)];
  const raw = JSON.stringify(next);
  sessionStorage.setItem(DIFFS_KEY, raw);
  diffsRaw = raw;
  diffsCache = next;
  window.dispatchEvent(new Event(DIFFS_EVENT));
  return diff;
}

export function getStoredDiff(id: string): DiffResult | undefined {
  return readStoredDiffs().find((d) => d.id === id);
}

export function nextBaselineVersion(endpointId: string): number {
  const versions = getBaselinesForEndpoint(endpointId).map((b) => b.version);
  return versions.length ? Math.max(...versions) + 1 : 1;
}

export type CheckResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  contentSize: number;
  error?: string;
};

export async function executeCheck(input: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<CheckResponse> {
  const res = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as CheckResponse & { error?: string };
  if (!res.ok && data.statusCode == null) {
    throw new Error(data.error || "Check failed.");
  }
  return data;
}

export function healthFromDiff(
  breaking: number,
  warning: number
): HealthStatus {
  if (breaking > 0) return "breaking";
  if (warning > 0) return "warning";
  return "healthy";
}

export function syncEndpointAfterCheck(
  endpoint: Endpoint,
  patch: Partial<Endpoint>
) {
  if (endpoint.id.startsWith("imported_")) {
    updateImportedEndpoint(endpoint.id, patch);
  }
}
