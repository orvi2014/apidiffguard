"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  Check,
  Minus,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiffChange, DiffChangeType, Severity } from "@/lib/types";
import type { JsonTreeNode } from "@/lib/diff-engine";

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

const changeColors: Record<DiffChangeType, string> = {
  added: "text-success",
  removed: "text-danger",
  changed: "text-warning",
  type_changed: "text-danger",
  status_changed: "text-danger",
  header_changed: "text-warning",
};

const severityBorder: Record<Severity, string> = {
  info: "border-l-info/50",
  warning: "border-l-warning",
  breaking: "border-l-danger",
};

function ChangeGlyph({ type }: { type?: DiffChangeType }) {
  if (!type) return null;
  if (type === "added")
    return <Plus className="size-3 text-success shrink-0" />;
  if (type === "removed")
    return <Minus className="size-3 text-danger shrink-0" />;
  return <TriangleAlert className="size-3 text-warning shrink-0" />;
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  search,
  selectedPath,
  onSelect,
}: {
  node: JsonTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  search: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const isOpen = expanded.has(node.path);
  const hasChildren = Boolean(node.children?.length);
  const matchesSearch =
    !search ||
    node.path.toLowerCase().includes(search.toLowerCase()) ||
    node.key.toLowerCase().includes(search.toLowerCase());

  if (!matchesSearch && !hasChildren) return null;

  const copyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(node.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={selectedPath === node.path}
        onClick={() => {
          onSelect(node.path);
          if (hasChildren) onToggle(node.path);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node.path);
            if (hasChildren) onToggle(node.path);
          }
        }}
        className={cn(
          "group flex items-center gap-1.5 py-[3px] pr-2 text-[12.5px] font-mono cursor-pointer border-l-2 border-transparent hover:bg-surface-elevated/80 transition-colors duration-100",
          selectedPath === node.path && "bg-accent-muted border-l-accent",
          node.severity && severityBorder[node.severity],
          node.changeType && "bg-surface/40"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3.5 text-muted-foreground shrink-0 transition-transform duration-150",
              isOpen && "rotate-90"
            )}
          />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <ChangeGlyph type={node.changeType} />

        <span className="text-muted">{node.key}</span>
        {hasChildren ? (
          <span className="text-muted-foreground/60">
            {node.kind === "array" ? `[${node.children?.length}]` : "{…}"}
          </span>
        ) : (
          <>
            <span className="text-muted-foreground/50">:</span>
            <span
              className={cn(
                node.changeType ? changeColors[node.changeType] : "text-[#e5c07b]"
              )}
            >
              {formatValue(node.value)}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={copyPath}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-border cursor-pointer"
          aria-label={`Copy path ${node.path}`}
        >
          {copied ? (
            <Check className="size-3 text-success" />
          ) : (
            <Copy className="size-3 text-muted" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                search={search}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function collectPaths(node: JsonTreeNode, acc: string[] = []): string[] {
  acc.push(node.path);
  node.children?.forEach((c) => collectPaths(c, acc));
  return acc;
}

export function DiffTree({
  tree,
  changes,
  search = "",
  className,
}: {
  tree: JsonTreeNode;
  changes?: DiffChange[];
  search?: string;
  className?: string;
}) {
  const allPaths = React.useMemo(() => collectPaths(tree), [tree]);
  const [manualExpanded, setManualExpanded] = React.useState<Set<string>>(
    () => new Set(allPaths.slice(0, 12))
  );
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);

  const searchMatches = React.useMemo(() => {
    if (!search) return [] as string[];
    return allPaths.filter((p) =>
      p.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allPaths]);

  const expanded = React.useMemo(() => {
    if (!searchMatches.length) return manualExpanded;
    return new Set([...manualExpanded, ...searchMatches]);
  }, [manualExpanded, searchMatches]);

  const activeSelected = searchMatches[0] ?? selectedPath;

  const toggle = (path: string) => {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => setManualExpanded(new Set(allPaths));
  const collapseAll = () => setManualExpanded(new Set([tree.path]));

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border-subtle text-[11px] text-muted">
        <button
          type="button"
          onClick={expandAll}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          Expand all
        </button>
        <span className="text-border">·</span>
        <button
          type="button"
          onClick={collapseAll}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          Collapse all
        </button>
        {changes && (
          <>
            <span className="text-border">·</span>
            <span>{changes.length} changes</span>
          </>
        )}
      </div>
      <div role="tree" className="overflow-auto flex-1 py-1">
        <TreeNode
          node={tree}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          search={search}
          selectedPath={activeSelected}
          onSelect={setSelectedPath}
        />
      </div>
    </div>
  );
}

export function JSONViewer({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-auto p-4 text-[12.5px] font-mono leading-relaxed text-[#d4d4d8]",
        className
      )}
    >
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}
