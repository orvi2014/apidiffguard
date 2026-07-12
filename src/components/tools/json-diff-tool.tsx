"use client";

import * as React from "react";
import { SeverityBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import {
  JsonTextarea,
  byteLength,
  parseJsonSafe,
  sizeToneFor,
} from "@/components/tools/json-textarea";
import {
  buildJsonTree,
  changesToMap,
  compareJson,
  summarizeChanges,
} from "@/lib/diff-engine";
import { DiffTree } from "@/components/diff/diff-tree";
import { cn, formatBytes } from "@/lib/utils";

const SAMPLE_OLD = `{
  "data": {
    "name": "Alex Rivera",
    "role": "admin",
    "pagination": { "per_page": 20 }
  }
}`;

const SAMPLE_NEW = `{
  "data": {
    "full_name": "Alex Rivera",
    "role": "admin",
    "pagination": { "per_page": 25 }
  }
}`;

export function JsonDiffTool() {
  const [left, setLeft] = React.useState(SAMPLE_OLD);
  const [right, setRight] = React.useState(SAMPLE_NEW);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);

  const leftBytes = React.useMemo(() => byteLength(left), [left]);
  const rightBytes = React.useMemo(() => byteLength(right), [right]);
  const leftTone = sizeToneFor(leftBytes);
  const rightTone = sizeToneFor(rightBytes);
  const blocked = leftTone === "block" || rightTone === "block";

  const { changes, summary, leftTree, rightTree, diffMs, leftError, rightError, canDiff } =
    React.useMemo(() => {
      if (blocked) {
        return {
          changes: [],
          summary: summarizeChanges([]),
          leftTree: null,
          rightTree: null,
          diffMs: null as number | null,
          leftError: null as string | null,
          rightError: null as string | null,
          canDiff: false,
        };
      }

      const leftParsed = parseJsonSafe(left);
      const rightParsed = parseJsonSafe(right);

      if (leftParsed.value === undefined || rightParsed.value === undefined) {
        return {
          changes: [],
          summary: summarizeChanges([]),
          leftTree: null,
          rightTree: null,
          diffMs: null,
          leftError: left.trim() ? leftParsed.error ?? null : null,
          rightError: right.trim() ? rightParsed.error ?? null : null,
          canDiff: false,
        };
      }

      const started = performance.now();
      const nextChanges = compareJson(leftParsed.value, rightParsed.value);
      const elapsed = performance.now() - started;
      const map = changesToMap(nextChanges);

      return {
        changes: nextChanges,
        summary: summarizeChanges(nextChanges),
        leftTree: buildJsonTree(leftParsed.value, "", "root", map),
        rightTree: buildJsonTree(rightParsed.value, "", "root", map),
        diffMs: elapsed,
        leftError: null,
        rightError: null,
        canDiff: true,
      };
    }, [blocked, left, right]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setLeft(SAMPLE_OLD);
              setRight(SAMPLE_NEW);
            }}
          >
            Load sample
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setLeft("");
              setRight("");
            }}
          >
            Clear both
          </Button>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          Limit {formatBytes(2 * 1024 * 1024)} / side · warn at{" "}
          {formatBytes(1 * 1024 * 1024)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextarea
          label="Original JSON"
          value={left}
          onChange={setLeft}
          error={leftTone !== "block" ? leftError : null}
          sizeBytes={leftBytes}
          sizeTone={leftTone}
        />
        <JsonTextarea
          label="New JSON"
          value={right}
          onChange={setRight}
          error={rightTone !== "block" ? rightError : null}
          sizeBytes={rightBytes}
          sizeTone={rightTone}
        />
      </div>

      {blocked ? (
        <p className="rounded-lg border border-danger/30 bg-danger-muted px-4 py-3 text-sm text-danger">
          Diff paused — one or both sides exceed {formatBytes(2 * 1024 * 1024)}.
          Trim the payload to continue in the browser tool.
        </p>
      ) : null}

      {canDiff ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono tabular-nums text-foreground">
              {changes.length} change{changes.length === 1 ? "" : "s"}
            </span>
            {summary.breakingCount ? (
              <SeverityBadge severity="breaking" />
            ) : null}
            {summary.warningCount ? (
              <SeverityBadge severity="warning" />
            ) : null}
            {summary.infoCount ? <SeverityBadge severity="info" /> : null}
            <span className="text-xs text-muted-foreground">
              {summary.added} added · {summary.removed} removed ·{" "}
              {summary.changed} changed
            </span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatBytes(leftBytes)} + {formatBytes(rightBytes)}
              {diffMs != null
                ? ` · diff ${diffMs < 1 ? "<1" : diffMs.toFixed(1)} ms`
                : null}
            </span>
          </div>

          {changes.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
              No differences — the two JSON values are equal.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr_1fr]">
              <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Changes
                </div>
                <ul>
                  {changes.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPath(c.path)}
                        className={cn(
                          "flex w-full flex-col gap-1 border-b border-border-subtle px-3 py-2.5 text-left hover:bg-surface",
                          selectedPath === c.path && "bg-accent-muted"
                        )}
                      >
                        <SeverityBadge severity={c.severity} />
                        <span className="truncate font-mono text-[11px]">
                          {c.path}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {leftTree ? (
                <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Original
                  </div>
                  <DiffTree
                    tree={leftTree}
                    changes={changes}
                    search={selectedPath ?? ""}
                  />
                </div>
              ) : null}
              {rightTree ? (
                <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    New
                  </div>
                  <DiffTree
                    tree={rightTree}
                    changes={changes}
                    search={selectedPath ?? ""}
                  />
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : !blocked ? (
        <p className="text-sm text-muted-foreground">
          Fix JSON errors above to see the diff.
        </p>
      ) : null}
    </div>
  );
}
