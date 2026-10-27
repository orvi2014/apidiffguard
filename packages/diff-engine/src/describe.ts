/**
 * A plain-text account of a change list.
 *
 * The change list is the precise record; this is the version a person reads
 * in a notification, or an agent reads before deciding whether to open the
 * full list. It leads with counts, then names the most severe changes —
 * which is the order anyone triaging a break asks about them in.
 *
 * Values are deliberately left out (old and new types are kept): the text
 * travels to places the response body should not, like chat and agent logs.
 */

/** The subset of a change this reads, so callers with their own type fit. */
export interface DescribableChange {
  path: string;
  type: string;
  severity: string;
  oldType?: string;
  newType?: string;
}

const SEVERITY_RANK: Record<string, number> = { breaking: 0, warning: 1, info: 2 };

function verb(c: DescribableChange): string {
  switch (c.type) {
    case "added":
      return "added";
    case "removed":
      return "removed";
    case "type_changed":
      return c.oldType && c.newType
        ? `changed type ${c.oldType} → ${c.newType}`
        : "changed type";
    case "nullability_changed":
      return c.newType === "null" ? "became null" : "changed nullability";
    case "status_changed":
      return "status code changed";
    case "header_changed":
      return "header changed";
    case "contract_violation":
      return "violates the response contract";
    default:
      return "changed";
  }
}

export function describeChanges(
  changes: DescribableChange[],
  options: { limit?: number } = {}
): string {
  if (changes.length === 0) return "No changes.";
  const limit = options.limit ?? 5;

  const counts = ["breaking", "warning", "info"]
    .map((s) => [s, changes.filter((c) => c.severity === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`);

  const ranked = [...changes].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3)
  );
  const shown = ranked
    .slice(0, limit)
    .map((c) => `${c.path || "(root)"} ${verb(c)} [${c.severity}]`);
  const more = changes.length - shown.length;

  return `${counts.join(", ")}. ${shown.join("; ")}${more > 0 ? `; and ${more} more` : ""}.`;
}
