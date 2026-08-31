import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ChangelogGroup = {
  /** "Added" | "Changed" | "Fixed" | null for bullets before any heading. */
  heading: string | null;
  items: string[];
};

export type ChangelogEntry = {
  version: string;
  date: string | null;
  items: string[];
  /**
   * The same bullets, kept under their `### Added` / `### Changed` / `### Fixed`
   * headings. A thirty-bullet release read as one undifferentiated wall
   * otherwise, with a security fix at the same weight as a copy tweak.
   */
  groups: ChangelogGroup[];
};

/** Parse root CHANGELOG.md into structured release notes (newest first). */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let group: ChangelogGroup | null = null;

  const openGroup = (heading: string | null) => {
    if (!current) return;
    group = { heading, items: [] };
    current.groups.push(group);
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();

    const heading = line.match(/^## \[([^\]]+)\](?:\s+[—-]\s+(.+))?$/);
    if (heading) {
      if (current && current.items.length) entries.push(current);
      const version = heading[1]!;
      current = {
        // Unreleased used to be dropped entirely, which is why everything
        // shipped since the last version bump was invisible on /changelog.
        version: version.toLowerCase() === "unreleased" ? "Unreleased" : version,
        date: heading[2]?.trim() ?? null,
        items: [],
        groups: [],
      };
      group = null;
      continue;
    }

    if (!current) continue;

    const sub = line.match(/^###\s+(.+)$/);
    if (sub) {
      openGroup(sub[1]!.trim());
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const text = bullet[1]!.trim();
      current.items.push(text);
      if (!group) openGroup(null);
      group!.items.push(text);
    }
  }
  if (current && current.items.length) entries.push(current);
  return entries.map((e) => ({
    ...e,
    groups: e.groups.filter((g) => g.items.length),
  }));
}

export function loadChangelog(): ChangelogEntry[] {
  const path = join(process.cwd(), "CHANGELOG.md");
  return parseChangelog(readFileSync(path, "utf8"));
}
