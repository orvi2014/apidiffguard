import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("design tokens", () => {
  /*
   * `--muted` is shadcn's surface grey (#18181b). globals.css repoints the
   * exact class `.text-muted` at readable secondary text, but an opacity
   * variant (`text-muted/` plus a number) is a different class and still compiles to
   * the surface grey — about 1:1 on a panel, i.e. invisible text.
   */
  it("never uses an opacity variant of text-muted", () => {
    const offenders = sourceFiles("src").flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) =>
          /\btext-muted\/\d/.test(line) ? [`${file}:${i + 1}`] : []
        )
    );
    assert.deepEqual(
      offenders,
      [],
      "Use text-muted-foreground/NN for faded secondary text"
    );
  });
});
