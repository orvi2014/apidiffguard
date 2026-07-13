"use client";

import * as React from "react";
import { AlertTriangle, Check, Copy, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ExpandOverlayShell,
  ExpandToggleButton,
} from "@/components/tools/expandable-panel";
import { cn, formatBytes } from "@/lib/utils";

/** Soft warn — UI still diffs, but we flag large payloads. */
export const JSON_SIZE_WARN_BYTES = 1 * 1024 * 1024;
/** Hard block — skip parse/diff to keep the tab responsive. */
export const JSON_SIZE_BLOCK_BYTES = 2 * 1024 * 1024;

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function EditorChrome({
  label,
  textareaId,
  size,
  sizeTone,
  expanded,
  onToggleExpand,
  onClear,
  onCopy,
  copied,
  value,
  hideExpand,
}: {
  label: string;
  textareaId: string;
  size: number;
  sizeTone?: "ok" | "warn" | "block";
  expanded: boolean;
  onToggleExpand: () => void;
  onClear: () => void;
  onCopy: () => void;
  copied: boolean;
  value: string;
  hideExpand?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <label
          htmlFor={textareaId}
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            sizeTone === "block" && "text-danger",
            sizeTone === "warn" && "text-warning",
            (!sizeTone || sizeTone === "ok") && "text-muted-foreground"
          )}
        >
          {formatBytes(size)}
        </span>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onClear}
          disabled={!value}
        >
          <Eraser className="size-3.5" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onCopy}
          disabled={!value}
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy
        </Button>
        {!hideExpand ? (
          <ExpandToggleButton expanded={expanded} onToggle={onToggleExpand} />
        ) : null}
      </div>
    </div>
  );
}

export function JsonTextarea({
  label,
  value,
  onChange,
  error,
  className,
  sizeBytes,
  sizeTone,
  /** When true, skip built-in expand (parent owns a dual expand). */
  hideExpand,
  /** Controlled expand from parent (e.g. expand-both). */
  expanded: expandedProp,
  onExpandedChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  className?: string;
  sizeBytes?: number;
  sizeTone?: "ok" | "warn" | "block";
  hideExpand?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const size = sizeBytes ?? byteLength(value);
  const textareaId = React.useId();
  const expanded = expandedProp ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const fieldClass = cn(
    "w-full rounded-lg border bg-surface px-3 py-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring",
    error || sizeTone === "block"
      ? "border-danger"
      : sizeTone === "warn"
        ? "border-warning/50"
        : "border-border"
  );

  const status = (
    <>
      {sizeTone === "warn" ? (
        <p
          id={`${textareaId}-status`}
          role="status"
          className="mt-2 flex items-start gap-1.5 text-xs text-warning"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Large payload ({formatBytes(size)}). Diff still runs; the tree may feel
          slow above 1 MB.
        </p>
      ) : null}
      {sizeTone === "block" ? (
        <p
          id={`${textareaId}-status`}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs text-danger"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Too large ({formatBytes(size)}). Max is{" "}
          {formatBytes(JSON_SIZE_BLOCK_BYTES)} per side — trim the JSON or use
          APIDiffGuard for stored baselines.
        </p>
      ) : null}
      {error && sizeTone !== "block" ? (
        <p
          id={`${textareaId}-status`}
          role="alert"
          className="mt-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </>
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <EditorChrome
        label={label}
        textareaId={textareaId}
        size={size}
        sizeTone={sizeTone}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
        onClear={() => onChange("")}
        onCopy={() => void copy()}
        copied={copied}
        value={value}
        hideExpand={hideExpand}
      />
      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={'{\n  "hello": "world"\n}'}
        aria-invalid={Boolean(error) || sizeTone === "block"}
        aria-describedby={
          error || sizeTone === "warn" || sizeTone === "block"
            ? `${textareaId}-status`
            : undefined
        }
        className={cn(
          fieldClass,
          hideExpand
            ? "min-h-0 flex-1 resize-none"
            : "min-h-[min(52vh,560px)] flex-1 resize-y"
        )}
      />
      {status}

      {expanded && !hideExpand ? (
        <ExpandOverlayShell title={label} onClose={() => setExpanded(false)}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoFocus
            aria-label={`${label} expanded`}
            className={cn(fieldClass, "min-h-0 flex-1 resize-none")}
          />
          <div className="shrink-0">{status}</div>
        </ExpandOverlayShell>
      ) : null}
    </div>
  );
}

export function parseJsonSafe(raw: string): {
  value?: unknown;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Paste JSON to continue." };
  try {
    return { value: JSON.parse(trimmed) as unknown };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid JSON.",
    };
  }
}

export function sizeToneFor(bytes: number): "ok" | "warn" | "block" {
  if (bytes >= JSON_SIZE_BLOCK_BYTES) return "block";
  if (bytes >= JSON_SIZE_WARN_BYTES) return "warn";
  return "ok";
}
