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
  OctagonAlert,
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
  nullability_changed: "text-danger",
  status_changed: "text-danger",
  header_changed: "text-warning",
  contract_violation: "text-danger",
};

const severityBorder: Record<Severity, string> = {
  info: "border-l-info/50",
  warning: "border-l-warning",
  breaking: "border-l-danger",
};

/** Change types the engine classifies as breaking (see severityFor). */
const BREAKING_TYPES = new Set<DiffChangeType>([
  "type_changed",
  "nullability_changed",
  "status_changed",
  "contract_violation",
]);

function ChangeGlyph({ type }: { type?: DiffChangeType }) {
  if (!type) return null;
  if (type === "added")
    return (
      <Plus className="size-3 text-success shrink-0" aria-label="Added" />
    );
  if (type === "removed")
    return (
      <Minus className="size-3 text-danger shrink-0" aria-label="Removed" />
    );
  // Breaking and warning changes previously shared one amber triangle, so the
  // only difference was hue — unreadable for anyone who cannot separate red
  // from amber, on the surface where "is this safe to ship" gets decided.
  if (BREAKING_TYPES.has(type))
    return (
      <OctagonAlert
        className="size-3 text-danger shrink-0"
        aria-label="Breaking change"
      />
    );
  return (
    <TriangleAlert
      className="size-3 text-warning shrink-0"
      aria-label="Warning"
    />
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  search,
  selectedPath,
  onSelect,
  focusedPath,
  onFocusNode,
  onKeyDown,
}: {
  node: JsonTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  search: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  focusedPath: string | null;
  onFocusNode: (path: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent,
    node: JsonTreeNode,
    hasChildren: boolean,
    isOpen: boolean
  ) => void;
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
        data-tree-node={node.path}
        tabIndex={focusedPath === node.path ? 0 : -1}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={selectedPath === node.path}
        onClick={() => {
          onSelect(node.path);
          if (hasChildren) onToggle(node.path);
        }}
        onKeyDown={(e) => onKeyDown(e, node, hasChildren, isOpen)}
        onFocus={() => onFocusNode(node.path)}
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
          className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity p-0.5 rounded hover:bg-border cursor-pointer"
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
                focusedPath={focusedPath}
                onFocusNode={onFocusNode}
                onKeyDown={onKeyDown}
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

  // Expand every ancestor of every change, so a breaking change is never
  // hidden inside a collapsed branch. The old behaviour took the first 12
  // paths in depth-first order, which usually spent the whole budget inside
  // the first top-level key and left later branches — and their breaking
  // changes — collapsed and invisible.
  const [manualExpanded, setManualExpanded] = React.useState<Set<string>>(
    () => {
      const open = new Set<string>([tree.path]);
      for (const change of changes ?? []) {
        const segments = change.path.split(".");
        for (let i = 1; i < segments.length; i += 1) {
          open.add(segments.slice(0, i).join("."));
        }
        open.add(change.path);
      }
      // With no changes to guide it, fall back to the first level only.
      if (open.size <= 1) {
        tree.children?.forEach((c) => open.add(c.path));
      }
      return open;
    }
  );
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [focusedPath, setFocusedPath] = React.useState<string | null>(null);
  const toggle = React.useCallback((path: string) => {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);
  const treeRef = React.useRef<HTMLDivElement>(null);

  /** Move DOM focus to a node, which also updates the roving tabindex. */
  const focusNode = React.useCallback((path: string) => {
    setFocusedPath(path);
    const el = treeRef.current?.querySelector<HTMLElement>(
      `[data-tree-node="${CSS.escape(path)}"]`
    );
    el?.focus();
  }, []);

  /**
   * WAI-ARIA treeview keys. The tree already claimed role="tree"/"treeitem",
   * which promises this interaction model; without it a keyboard user had to
   * Tab once per node through a diff that can run to hundreds of rows.
   */
  const handleTreeKeyDown = React.useCallback(
    (
      e: React.KeyboardEvent,
      node: JsonTreeNode,
      hasChildren: boolean,
      isOpen: boolean
    ) => {
      const visible = treeRef.current
        ? Array.from(
            treeRef.current.querySelectorAll<HTMLElement>("[data-tree-node]")
          ).map((el) => el.dataset.treeNode as string)
        : [];
      const index = visible.indexOf(node.path);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (index >= 0 && index < visible.length - 1)
            focusNode(visible[index + 1]);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0) focusNode(visible[index - 1]);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasChildren && !isOpen) toggle(node.path);
          else if (hasChildren && index >= 0 && index < visible.length - 1)
            focusNode(visible[index + 1]);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasChildren && isOpen) toggle(node.path);
          else {
            // Step out to the parent path.
            const parent = node.path.split(".").slice(0, -1).join(".");
            if (parent && visible.includes(parent)) focusNode(parent);
          }
          break;
        case "Home":
          e.preventDefault();
          if (visible.length) focusNode(visible[0]);
          break;
        case "End":
          e.preventDefault();
          if (visible.length) focusNode(visible[visible.length - 1]);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          setSelectedPath(node.path);
          if (hasChildren) toggle(node.path);
          break;
        default:
          break;
      }
    },
    [focusNode, toggle]
  );

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
      <div role="tree" ref={treeRef} className="overflow-auto flex-1 py-1">
        <TreeNode
          node={tree}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          search={search}
          selectedPath={activeSelected}
          onSelect={setSelectedPath}
          focusedPath={focusedPath ?? tree.path}
          onFocusNode={setFocusedPath}
          onKeyDown={handleTreeKeyDown}
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
