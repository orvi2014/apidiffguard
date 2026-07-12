import type { Endpoint } from "./types";

export const IMPORTED_STORAGE_KEY = "apidiffguard:imported";
export const IMPORTED_EVENT = "apidiffguard:imported";

const EMPTY: Endpoint[] = [];

let cachedRaw: string | null = null;
let cachedImported: Endpoint[] = EMPTY;

export function readImportedEndpoints(): Endpoint[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = sessionStorage.getItem(IMPORTED_STORAGE_KEY);
    if (raw === cachedRaw) return cachedImported;
    cachedRaw = raw;
    if (!raw) {
      cachedImported = EMPTY;
      return cachedImported;
    }
    cachedImported = JSON.parse(raw) as Endpoint[];
    return cachedImported;
  } catch {
    cachedRaw = null;
    cachedImported = EMPTY;
    return cachedImported;
  }
}

export function subscribeImportedEndpoints(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === IMPORTED_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(IMPORTED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(IMPORTED_EVENT, onStoreChange);
  };
}

export function getServerImportedSnapshot(): Endpoint[] {
  return EMPTY;
}

export function saveImportedEndpoints(endpoints: Endpoint[]) {
  const existing = readImportedEndpoints();
  const merged = [...endpoints, ...existing];
  const raw = JSON.stringify(merged);
  sessionStorage.setItem(IMPORTED_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedImported = merged;
  window.dispatchEvent(new Event(IMPORTED_EVENT));
  return merged;
}

export function getImportedEndpoint(id: string): Endpoint | undefined {
  return readImportedEndpoints().find((e) => e.id === id);
}

export function updateImportedEndpoint(
  id: string,
  patch: Partial<Endpoint>
): Endpoint | undefined {
  const list = readImportedEndpoints();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  const next = [...list];
  next[idx] = { ...next[idx]!, ...patch };
  const raw = JSON.stringify(next);
  sessionStorage.setItem(IMPORTED_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedImported = next;
  window.dispatchEvent(new Event(IMPORTED_EVENT));
  return next[idx];
}

export function removeImportedEndpoint(id: string) {
  const next = readImportedEndpoints().filter((e) => e.id !== id);
  const raw = JSON.stringify(next);
  sessionStorage.setItem(IMPORTED_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedImported = next;
  window.dispatchEvent(new Event(IMPORTED_EVENT));
}
