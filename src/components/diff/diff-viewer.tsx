"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kbd } from "@/components/ui/kbd";
import { SeverityBadge } from "@/components/domain/badges";
import { DiffTree, JSONViewer } from "@/components/diff/diff-tree";
import {
  buildJsonTree,
  changesToMap,
  summarizeChanges,
  type JsonTreeNode,
} from "@/lib/diff-engine";
import type { DiffResult } from "@/lib/types";
import { cn, formatBytes, formatMs, formatRelativeTime } from "@/lib/utils";

export function DiffViewer({ diff }: { diff: DiffResult }) {
  const [search, setSearch] = React.useState("");
  const [changeIndex, setChangeIndex] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const [tab, setTab] = React.useState("summary");
  const [bodies, setBodies] = React.useState<{
    baselineBody: unknown;
    currentBody: unknown;
  } | null>(diff.baseline.body != null && diff.current.body != null
    ? { baselineBody: diff.baseline.body, currentBody: diff.current.body }
    : null);
  const [bodiesError, setBodiesError] = React.useState<string | null>(null);
  const [bodiesLoading, setBodiesLoading] = React.useState(false);

  const summary = summarizeChanges(diff.changes);
  const changeMap = React.useMemo(
    () => changesToMap(diff.changes),
    [diff.changes]
  );

  const oldTree: JsonTreeNode | null = React.useMemo(
    () =>
      bodies
        ? buildJsonTree(bodies.baselineBody, "", "root", changeMap)
        : null,
    [bodies, changeMap]
  );
  const newTree: JsonTreeNode | null = React.useMemo(
    () =>
      bodies
        ? buildJsonTree(bodies.currentBody, "", "root", changeMap)
        : null,
    [bodies, changeMap]
  );

  React.useEffect(() => {
    if (tab === "summary" || bodies || bodiesLoading) return;
    setBodiesLoading(true);
    setBodiesError(null);
    void fetch(`/api/diffs/${diff.id}/bodies`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load response bodies");
        return r.json() as Promise<{
          baselineBody: unknown;
          currentBody: unknown;
        }>;
      })
      .then((data) => {
        setBodies({
          baselineBody: data.baselineBody,
          currentBody: data.currentBody,
        });
      })
      .catch((err: unknown) => {
        setBodiesError(
          err instanceof Error ? err.message : "Could not load response bodies"
        );
      })
      .finally(() => setBodiesLoading(false));
  }, [tab, bodies, bodiesLoading, diff.id]);

  const jump = (dir: 1 | -1) => {
    if (!diff.changes.length) return;
    setChangeIndex(
      (i) => (i + dir + diff.changes.length) % diff.changes.length
    );
    setSearch(diff.changes[(changeIndex + dir + diff.changes.length) % diff.changes.length].path);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        jump(1);
      }
      if (e.key === "p" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        jump(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const copyDiff = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          endpoint: diff.endpointName,
          summary,
          changes: diff.changes,
        },
        null,
        2
      )
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Endpoints</span>
              <ChevronRight className="size-3" />
              <span className="text-foreground">{diff.endpointName}</span>
              <ChevronRight className="size-3" />
              <span className="font-mono text-muted">diff/{diff.id.slice(0, 12)}</span>
            </div>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              Response diff
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => jump(-1)}>
              <ArrowUp className="size-3.5" />
              Prev
            </Button>
            <Button variant="secondary" size="sm" onClick={() => jump(1)}>
              <ArrowDown className="size-3.5" />
              Next
            </Button>
            <Button variant="secondary" size="sm" onClick={copyDiff}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy diff
            </Button>
            <Button size="sm">Accept baseline</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle px-4 py-2 text-xs">
          <Stat
            label="Breaking"
            value={diff.breakingCount}
            className="text-danger"
          />
          <Stat
            label="Warnings"
            value={diff.warningCount}
            className="text-warning"
          />
          <Stat label="Info" value={diff.infoCount} className="text-info" />
          <span className="text-border">|</span>
          <span className="text-muted">
            Baseline v{diff.baseline.version} · {diff.baseline.statusCode}
          </span>
          <span className="text-muted">→</span>
          <span className="text-muted">
            Current · {diff.current.statusCode}
          </span>
          <span className="text-border">|</span>
          <span className="text-muted">
            {formatMs(diff.baseline.responseTime)} →{" "}
            {formatMs(diff.current.responseTime)}
          </span>
          <span className="text-muted">
            {formatBytes(diff.baseline.contentSize)} →{" "}
            {formatBytes(diff.current.contentSize)}
          </span>
          <span className="ml-auto text-muted">
            {formatRelativeTime(diff.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Change list inspector */}
        <aside className="flex w-full shrink-0 flex-col border-b border-border lg:w-80 lg:border-b-0 lg:border-r">
          <div className="border-b border-border-subtle px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search path…"
                className="h-8 pl-8 font-mono text-xs"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
              Jump <Kbd>n</Kbd> / <Kbd>p</Kbd>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {diff.changes
              .filter(
                (c) =>
                  !search ||
                  c.path.toLowerCase().includes(search.toLowerCase()) ||
                  c.message.toLowerCase().includes(search.toLowerCase())
              )
              .map((change, i) => (
                <button
                  key={change.id}
                  type="button"
                  onClick={() => {
                    setChangeIndex(i);
                    setSearch(change.path);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border-subtle px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer hover:bg-surface",
                    change.path === search && "bg-accent-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={change.severity} />
                    <span className="font-mono text-[11px] text-muted truncate">
                      {change.type}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-foreground truncate">
                    {change.path}
                  </span>
                  <span className="text-[11px] text-muted line-clamp-2">
                    {change.message}
                  </span>
                </button>
              ))}
          </div>
        </aside>

        {/* Main panes */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="flex-1 overflow-auto p-4">
              <SummaryPanel diff={diff} summary={summary} />
            </TabsContent>

            <TabsContent
              value="side-by-side"
              className="flex min-h-0 flex-1 flex-col lg:flex-row"
            >
              {bodiesLoading || !oldTree || !newTree ? (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
                  {bodiesError ?? "Loading response trees…"}
                </div>
              ) : (
                <>
              <div className="flex min-h-[280px] min-w-0 flex-1 flex-col border-b border-border lg:border-b-0 lg:border-r">
                <PaneHeader
                  title="Old response"
                  meta={`baseline v${diff.baseline.version}`}
                  tone="old"
                />
                <DiffTree
                  tree={oldTree}
                  changes={diff.changes}
                  search={search}
                  className="flex-1"
                />
              </div>
              <div className="hidden w-10 shrink-0 flex-col items-center justify-center gap-2 border-r border-border bg-surface/50 lg:flex">
                {diff.changes.slice(0, 8).map((c) => (
                  <span
                    key={c.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      c.severity === "breaking" && "bg-danger",
                      c.severity === "warning" && "bg-warning",
                      c.severity === "info" && "bg-info"
                    )}
                    title={c.path}
                  />
                ))}
              </div>
              <div className="flex min-h-[280px] min-w-0 flex-1 flex-col">
                <PaneHeader
                  title="New response"
                  meta="current check"
                  tone="new"
                />
                <DiffTree
                  tree={newTree}
                  changes={diff.changes}
                  search={search}
                  className="flex-1"
                />
              </div>
                </>
              )}
            </TabsContent>

            <TabsContent
              value="raw"
              className="flex min-h-0 flex-1 flex-col lg:flex-row"
            >
              {bodiesLoading || !bodies ? (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
                  {bodiesError ?? "Loading raw JSON…"}
                </div>
              ) : (
                <>
              <div className="min-h-[280px] flex-1 border-b border-border lg:border-b-0 lg:border-r">
                <PaneHeader title="Old JSON" meta="baseline" tone="old" />
                <JSONViewer data={bodies.baselineBody} className="h-[calc(100%-36px)]" />
              </div>
              <div className="min-h-[280px] flex-1">
                <PaneHeader title="New JSON" meta="current" tone="new" />
                <JSONViewer data={bodies.currentBody} className="h-[calc(100%-36px)]" />
              </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function PaneHeader({
  title,
  meta,
  tone,
}: {
  title: string;
  meta: string;
  tone: "old" | "new";
}) {
  return (
    <div className="flex h-9 items-center justify-between border-b border-border-subtle bg-surface px-3">
      <span className="text-xs font-medium">{title}</span>
      <span
        className={cn(
          "text-[11px] font-mono",
          tone === "old" ? "text-danger/80" : "text-success/80"
        )}
      >
        {meta}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cn("font-mono text-sm font-semibold tabular-nums", className)}>
        {value}
      </span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

function SummaryPanel({
  diff,
  summary,
}: {
  diff: DiffResult;
  summary: ReturnType<typeof summarizeChanges>;
}) {
  const groups = [
    {
      title: "Breaking changes",
      items: diff.changes.filter((c) => c.severity === "breaking"),
      color: "text-danger",
    },
    {
      title: "Warnings",
      items: diff.changes.filter((c) => c.severity === "warning"),
      color: "text-warning",
    },
    {
      title: "Additions & info",
      items: diff.changes.filter((c) => c.severity === "info"),
      color: "text-info",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { label: "Breaking", value: summary.breakingCount, color: "text-danger" },
          { label: "Warnings", value: summary.warningCount, color: "text-warning" },
          { label: "Additions", value: summary.added, color: "text-success" },
          { label: "Removals", value: summary.removed, color: "text-danger" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <div className={cn("font-mono text-3xl font-semibold tabular-nums tracking-tight", s.color)}>
              {s.value}
            </div>
            <div className="text-xs text-muted uppercase tracking-wider">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {groups.map((group) =>
        group.items.length ? (
          <section key={group.title} className="space-y-3">
            <h2 className={cn("text-sm font-medium", group.color)}>
              {group.title}
            </h2>
            <ul className="space-y-0 divide-y divide-border-subtle border-y border-border-subtle">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4"
                >
                  <code className="shrink-0 font-mono text-xs text-foreground sm:w-56">
                    {item.path}
                  </code>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">{item.message}</p>
                    <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px]">
                      {item.oldValue !== undefined && (
                        <span className="text-danger">
                          − {JSON.stringify(item.oldValue)}
                        </span>
                      )}
                      {item.newValue !== undefined && (
                        <span className="text-success">
                          + {JSON.stringify(item.newValue)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
  );
}
