import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ChangelogEntry = {
  version: string;
  date: string | null;
  items: string[];
};

/** Parse root CHANGELOG.md into structured release notes (newest first). */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    const heading = line.match(/^## \[([^\]]+)\](?:\s+[—-]\s+(.+))?$/);
    if (heading) {
      if (current && current.items.length) entries.push(current);
      const version = heading[1]!;
      if (version.toLowerCase() === "unreleased") {
        current = null;
        continue;
      }
      current = {
        version,
        date: heading[2]?.trim() ?? null,
        items: [],
      };
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      current.items.push(bullet[1]!.trim());
    }
  }
  if (current && current.items.length) entries.push(current);
  return entries;
}

export function loadChangelog(): ChangelogEntry[] {
  const path = join(process.cwd(), "CHANGELOG.md");
  return parseChangelog(readFileSync(path, "utf8"));
}
