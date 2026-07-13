const IGNORE_DEFAULTS = new Set([
    "request_id",
    "timestamp",
    "created_at",
    "updated_at",
    "etag",
    "nonce",
    "uuid",
]);
function typeOf(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    return typeof value;
}
function isIgnoredPath(path, ignorePaths) {
    const leaf = path.split(".").pop()?.replace(/\[\d+\]/g, "") ?? "";
    if (IGNORE_DEFAULTS.has(leaf))
        return true;
    return ignorePaths.some((p) => path === p || path.startsWith(`${p}.`) || path.endsWith(`.${p}`));
}
function severityFor(type, path) {
    if (type === "removed" || type === "type_changed" || type === "status_changed") {
        return "breaking";
    }
    if (type === "changed" && !path.includes("meta") && !path.includes("preferences")) {
        return "warning";
    }
    return "info";
}
function pushChange(changes, partial) {
    const severity = partial.severity ?? severityFor(partial.type, partial.path);
    const message = partial.message ??
        {
            added: `Field added at ${partial.path}`,
            removed: `Field removed at ${partial.path}`,
            changed: `Value changed at ${partial.path}`,
            type_changed: `Type changed at ${partial.path}`,
            status_changed: "HTTP status code changed",
            header_changed: `Header changed: ${partial.path}`,
        }[partial.type];
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
/** Deep-compare two JSON values and return a list of field-level changes. */
export function compareJson(oldValue, newValue, options = {}) {
    const ignorePaths = options.ignorePaths ?? [];
    const path = options.path ?? "";
    const changes = [];
    const walk = (a, b, current) => {
        if (current && isIgnoredPath(current, ignorePaths))
            return;
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
            const ao = a;
            const bo = b;
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
export function summarizeChanges(changes) {
    return {
        breakingCount: changes.filter((c) => c.severity === "breaking").length,
        warningCount: changes.filter((c) => c.severity === "warning").length,
        infoCount: changes.filter((c) => c.severity === "info").length,
        added: changes.filter((c) => c.type === "added").length,
        removed: changes.filter((c) => c.type === "removed").length,
        changed: changes.filter((c) => c.type === "changed" || c.type === "type_changed").length,
    };
}
