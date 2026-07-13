export type Severity = "info" | "warning" | "breaking";

export type DiffChangeType =
  | "added"
  | "removed"
  | "changed"
  | "type_changed"
  | "nullability_changed"
  | "status_changed"
  | "header_changed"
  | "contract_violation";

export interface DiffChange {
  id: string;
  path: string;
  type: DiffChangeType;
  severity: Severity;
  oldValue?: unknown;
  newValue?: unknown;
  oldType?: string;
  newType?: string;
  message: string;
}

export interface CompareJsonOptions {
  ignorePaths?: string[];
  path?: string;
  /** When true, skip leaf value changes; keep added/removed/type/nullability. */
  schemaOnly?: boolean;
  /**
   * Match object array items by identity keys instead of index.
   * Default true. Falls back to index when items lack stable keys.
   */
  arrayIdentity?: boolean;
}

const IGNORE_DEFAULTS = new Set([
  "request_id",
  "timestamp",
  "created_at",
  "updated_at",
  "etag",
  "nonce",
  "uuid",
]);

const ARRAY_IDENTITY_KEYS = ["id", "_id", "uuid", "key", "slug", "name"] as const;

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isIgnoredPath(path: string, ignorePaths: string[]): boolean {
  const leaf = path.split(".").pop()?.replace(/\[[^\]]+\]/g, "") ?? "";
  if (IGNORE_DEFAULTS.has(leaf)) return true;
  return ignorePaths.some(
    (p) => path === p || path.startsWith(`${p}.`) || path.endsWith(`.${p}`)
  );
}

function severityFor(type: DiffChangeType, path: string): Severity {
  if (
    type === "removed" ||
    type === "type_changed" ||
    type === "nullability_changed" ||
    type === "contract_violation"
  ) {
    return "breaking";
  }
  if (type === "status_changed") {
    return "breaking";
  }
  if (type === "header_changed") {
    return "warning";
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
      nullability_changed: `Nullability changed at ${partial.path}`,
      status_changed: "HTTP status code changed",
      header_changed: `Header changed: ${partial.path}`,
      contract_violation: `Contract violation at ${partial.path}`,
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

function arrayItemIdentity(item: unknown): string | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const obj = item as Record<string, unknown>;
  for (const key of ARRAY_IDENTITY_KEYS) {
    const value = obj[key];
    if (typeof value === "string" || typeof value === "number") {
      return `${key}=${value}`;
    }
  }
  return null;
}

function canUseArrayIdentity(items: unknown[]): boolean {
  if (items.length === 0) return false;
  const keyed = items.filter((item) => arrayItemIdentity(item) != null).length;
  return keyed >= Math.ceil(items.length * 0.5);
}

/**
 * Compare HTTP status codes.
 * Same class (e.g. 200→201) is warning; class change (2xx→4xx) is breaking.
 */
export function compareStatusCodes(
  oldStatus: number,
  newStatus: number
): DiffChange | null {
  if (oldStatus === newStatus) return null;
  const oldClass = Math.floor(oldStatus / 100);
  const newClass = Math.floor(newStatus / 100);
  const sameClass = oldClass === newClass && oldClass >= 1 && oldClass <= 5;
  return {
    id: "chg_status",
    path: "$status",
    type: "status_changed",
    severity: sameClass ? "warning" : "breaking",
    oldValue: oldStatus,
    newValue: newStatus,
    message: sameClass
      ? `HTTP status changed within ${oldClass}xx: ${oldStatus} → ${newStatus}`
      : `HTTP status class changed ${oldStatus} → ${newStatus}`,
  };
}

/** Deep-compare two JSON values and return a list of field-level changes. */
export function compareJson(
  oldValue: unknown,
  newValue: unknown,
  options: CompareJsonOptions = {}
): DiffChange[] {
  const ignorePaths = options.ignorePaths ?? [];
  const path = options.path ?? "";
  const schemaOnly = options.schemaOnly ?? false;
  const arrayIdentity = options.arrayIdentity ?? true;
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

    if ((a === null) !== (b === null) && a !== undefined && b !== undefined) {
      pushChange(changes, {
        path: current || "$",
        type: "nullability_changed",
        oldValue: a,
        newValue: b,
        oldType: ta,
        newType: tb,
        message: `Nullability changed at ${current || "$"} (${ta} → ${tb})`,
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
      if (arrayIdentity && canUseArrayIdentity(a) && canUseArrayIdentity(b)) {
        const bById = new Map<string, { item: unknown; index: number }>();
        const usedB = new Set<number>();
        b.forEach((item, index) => {
          const id = arrayItemIdentity(item);
          if (id && !bById.has(id)) bById.set(id, { item, index });
        });

        a.forEach((item, index) => {
          const id = arrayItemIdentity(item);
          if (!id) {
            walk(item, b[index], `${current}[${index}]`);
            if (b[index] !== undefined) usedB.add(index);
            return;
          }
          const match = bById.get(id);
          if (!match) {
            pushChange(changes, {
              path: `${current}[${id}]`,
              type: "removed",
              oldValue: item,
              oldType: typeOf(item),
              message: `Array item removed at ${current}[${id}]`,
            });
            return;
          }
          usedB.add(match.index);
          walk(item, match.item, `${current}[${id}]`);
        });

        b.forEach((item, index) => {
          if (usedB.has(index)) return;
          const id = arrayItemIdentity(item) ?? String(index);
          pushChange(changes, {
            path: `${current}[${id}]`,
            type: "added",
            newValue: item,
            newType: typeOf(item),
            message: `Array item added at ${current}[${id}]`,
          });
        });
        return;
      }

      const max = Math.max(a.length, b.length);
      for (let i = 0; i < max; i++) {
        walk(a[i], b[i], `${current}[${i}]`);
      }
      return;
    }

    if (a !== b) {
      if (schemaOnly) return;
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
      (c) =>
        c.type === "changed" ||
        c.type === "type_changed" ||
        c.type === "nullability_changed" ||
        c.type === "contract_violation"
    ).length,
  };
}
