import type { DiffChange, DiffChangeType, Severity } from "./types";

const IGNORE_DEFAULTS = new Set([
  "request_id",
  "timestamp",
  "created_at",
  "updated_at",
  "etag",
  "nonce",
  "uuid",
]);

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isIgnoredPath(path: string, ignorePaths: string[]): boolean {
  const leaf = path.split(".").pop()?.replace(/\[\d+\]/g, "") ?? "";
  if (IGNORE_DEFAULTS.has(leaf)) return true;
  return ignorePaths.some(
    (p) => path === p || path.startsWith(`${p}.`) || path.endsWith(`.${p}`)
  );
}

function severityFor(type: DiffChangeType, path: string): Severity {
  if (type === "removed" || type === "type_changed" || type === "status_changed") {
    return "breaking";
  }
  if (type === "changed" && !path.includes("meta") && !path.includes("preferences")) {
    return "warning";
  }
  return "info";
}

function pushChange(
  changes: DiffChange[],
  partial: Omit<DiffChange, "id" | "severity" | "message"> & {
    message?: string;
    severity?: Severity;
  }
) {
  const severity = partial.severity ?? severityFor(partial.type, partial.path);
  const message =
    partial.message ??
    ({
      added: `Field added at ${partial.path}`,
      removed: `Field removed at ${partial.path}`,
      changed: `Value changed at ${partial.path}`,
      type_changed: `Type changed at ${partial.path}`,
      status_changed: "HTTP status code changed",
      header_changed: `Header changed: ${partial.path}`,
    }[partial.type] as string);

  changes.push({
    id: `chg_${changes.length + 1}`,
    path: partial.path,
    type: partial.type,
    severity,
    oldValue: partial.oldValue,
    newValue: partial.newValue,
    oldType: partial.oldType,
    newType: partial.newType,
    message,
  });
}

export function compareJson(
  oldValue: unknown,
  newValue: unknown,
  options: { ignorePaths?: string[]; path?: string } = {}
): DiffChange[] {
  const ignorePaths = options.ignorePaths ?? [];
  const path = options.path ?? "";
  const changes: DiffChange[] = [];

  const walk = (a: unknown, b: unknown, current: string) => {
    if (current && isIgnoredPath(current, ignorePaths)) return;

    const ta = typeOf(a);
    const tb = typeOf(b);

    if (a === undefined && b !== undefined) {
      pushChange(changes, {
        path: current || "$",
        type: "added",
        newValue: b,
        newType: tb,
      });
      return;
    }
    if (a !== undefined && b === undefined) {
      pushChange(changes, {
        path: current || "$",
        type: "removed",
        oldValue: a,
        oldType: ta,
      });
      return;
    }
    if (ta !== tb) {
      pushChange(changes, {
        path: current || "$",
        type: "type_changed",
        oldValue: a,
        newValue: b,
        oldType: ta,
        newType: tb,
      });
      return;
    }

    if (ta === "object" && a && b && typeof a === "object" && typeof b === "object") {
      const ao = a as Record<string, unknown>;
      const bo = b as Record<string, unknown>;
      const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
      for (const key of keys) {
        const next = current ? `${current}.${key}` : key;
        walk(ao[key], bo[key], next);
      }
      return;
    }

    if (ta === "array" && Array.isArray(a) && Array.isArray(b)) {
      const max = Math.max(a.length, b.length);
      for (let i = 0; i < max; i++) {
        walk(a[i], b[i], `${current}[${i}]`);
      }
      return;
    }

    if (a !== b) {
      pushChange(changes, {
        path: current || "$",
        type: "changed",
        oldValue: a,
        newValue: b,
        oldType: ta,
        newType: tb,
      });
    }
  };

  walk(oldValue, newValue, path);
  return changes;
}

export function summarizeChanges(changes: DiffChange[]) {
  return {
    breakingCount: changes.filter((c) => c.severity === "breaking").length,
    warningCount: changes.filter((c) => c.severity === "warning").length,
    infoCount: changes.filter((c) => c.severity === "info").length,
    added: changes.filter((c) => c.type === "added").length,
    removed: changes.filter((c) => c.type === "removed").length,
    changed: changes.filter(
      (c) => c.type === "changed" || c.type === "type_changed"
    ).length,
  };
}

export type JsonNodeKind = "object" | "array" | "value";

export interface JsonTreeNode {
  key: string;
  path: string;
  kind: JsonNodeKind;
  value?: unknown;
  children?: JsonTreeNode[];
  changeType?: DiffChangeType;
  severity?: Severity;
}

export function buildJsonTree(
  value: unknown,
  path = "",
  key = "root",
  changeMap: Map<string, DiffChange> = new Map()
): JsonTreeNode {
  const change = changeMap.get(path || "$") ?? changeMap.get(path);

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return {
      key,
      path: path || "$",
      kind: "object",
      changeType: change?.type,
      severity: change?.severity,
      children: Object.entries(obj).map(([k, v]) =>
        buildJsonTree(v, path ? `${path}.${k}` : k, k, changeMap)
      ),
    };
  }

  if (Array.isArray(value)) {
    return {
      key,
      path: path || "$",
      kind: "array",
      changeType: change?.type,
      severity: change?.severity,
      children: value.map((v, i) =>
        buildJsonTree(v, `${path}[${i}]`, String(i), changeMap)
      ),
    };
  }

  return {
    key,
    path: path || "$",
    kind: "value",
    value,
    changeType: change?.type,
    severity: change?.severity,
  };
}

export function changesToMap(changes: DiffChange[]) {
  return new Map(changes.map((c) => [c.path, c]));
}
