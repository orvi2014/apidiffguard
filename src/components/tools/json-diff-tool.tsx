"use client";

import * as React from "react";
import { SeverityBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import {
  ExpandOverlayShell,
  ExpandToggleButton,
  ExpandablePanel,
} from "@/components/tools/expandable-panel";
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

type DiffResult = {
  changes: ReturnType<typeof compareJson>;
  summary: ReturnType<typeof summarizeChanges>;
  leftTree: ReturnType<typeof buildJsonTree> | null;
  rightTree: ReturnType<typeof buildJsonTree> | null;
  diffMs: number | null;
  leftError: string | null;
  rightError: string | null;
  canDiff: boolean;
};

/**
 * Diffing lives outside the component and behind a one-entry cache.
 *
 * Timing the diff needs `performance.now()`, which is impure — calling it
 * during render made the memo return a different `diffMs` on every incidental
 * re-render. Caching on the exact inputs makes repeated calls genuinely
 * idempotent: the same inputs return the identical object, clock included.
 */
let diffCacheKey: string | null = null;
let diffCacheValue: DiffResult | null = null;

function computeDiff(
  left: string,
  right: string,
  schemaOnly: boolean,
  blocked: boolean
): DiffResult {
  const key = `${blocked ? 1 : 0}\u0000${schemaOnly ? 1 : 0}\u0000${left}\u0000${right}`;
  if (diffCacheKey === key && diffCacheValue) return diffCacheValue;

  const result = ((): DiffResult => {
    const empty = {
      changes: [],
      summary: summarizeChanges([]),
      leftTree: null,
      rightTree: null,
      diffMs: null,
      leftError: null,
      rightError: null,
      canDiff: false,
    } satisfies DiffResult;

    if (blocked) return empty;

    const leftParsed = parseJsonSafe(left);
    const rightParsed = parseJsonSafe(right);

    if (leftParsed.value === undefined || rightParsed.value === undefined) {
      return {
        ...empty,
        leftError: left.trim() ? (leftParsed.error ?? null) : null,
        rightError: right.trim() ? (rightParsed.error ?? null) : null,
      };
    }

    const started = performance.now();
    const nextChanges = compareJson(leftParsed.value, rightParsed.value, {
      schemaOnly,
      arrayIdentity: true,
    });
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
  })();

  diffCacheKey = key;
  diffCacheValue = result;
  return result;
}

export function JsonDiffTool() {
  const [left, setLeft] = React.useState(SAMPLE_OLD);
  const [right, setRight] = React.useState(SAMPLE_NEW);
  // Matches hosted checks, which default to schema mode. Starting in value-diff
  // mode showed a first-time visitor exactly the leaf churn the landing page
  // had just promised the product filters out.
  const [schemaOnly, setSchemaOnly] = React.useState(true);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [expandBoth, setExpandBoth] = React.useState(false);

  const leftBytes = React.useMemo(() => byteLength(left), [left]);
  const rightBytes = React.useMemo(() => byteLength(right), [right]);
  const leftTone = sizeToneFor(leftBytes);
  const rightTone = sizeToneFor(rightBytes);
  const blocked = leftTone === "block" || rightTone === "block";

  const {
    changes,
    summary,
    leftTree,
    rightTree,
    diffMs,
    leftError,
    rightError,
    canDiff,
  } = React.useMemo(
    () => computeDiff(left, right, schemaOnly, blocked),
    [blocked, left, right, schemaOnly]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <ExpandToggleButton
            expanded={expandBoth}
            onToggle={() => setExpandBoth((v) => !v)}
            label="Expand both"
          />
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 rounded border-border"
              checked={schemaOnly}
              onChange={(e) => setSchemaOnly(e.target.checked)}
            />
            Schema only
          </label>
          <span className="text-xs text-muted">
            On by default, as in monitoring — ignores value churn like counters
            and timestamps. Untick to see everything that changed.
          </span>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
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

      {expandBoth ? (
        <ExpandOverlayShell
          title="Compare JSON"
          onClose={() => setExpandBoth(false)}
        >
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
            <JsonTextarea
              label="Original JSON"
              value={left}
              onChange={setLeft}
              error={leftTone !== "block" ? leftError : null}
              sizeBytes={leftBytes}
              sizeTone={leftTone}
              hideExpand
              focusOnOpen
              className="min-h-0"
            />
            <JsonTextarea
              label="New JSON"
              value={right}
              onChange={setRight}
              error={rightTone !== "block" ? rightError : null}
              sizeBytes={rightBytes}
              sizeTone={rightTone}
              hideExpand
              className="min-h-0"
            />
          </div>
        </ExpandOverlayShell>
      ) : null}

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
            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
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
              <ExpandablePanel
                title="Changes"
                className="max-h-[min(60vh,640px)]"
              >
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
                        <span className="truncate font-mono text-xs">
                          {c.path}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </ExpandablePanel>
              {leftTree ? (
                <ExpandablePanel
                  title="Original"
                  className="max-h-[min(60vh,640px)]"
                >
                  <DiffTree
                    tree={leftTree}
                    changes={changes}
                    search={selectedPath ?? ""}
                  />
                </ExpandablePanel>
              ) : null}
              {rightTree ? (
                <ExpandablePanel
                  title="New"
                  className="max-h-[min(60vh,640px)]"
                >
                  <DiffTree
                    tree={rightTree}
                    changes={changes}
                    search={selectedPath ?? ""}
                  />
                </ExpandablePanel>
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
