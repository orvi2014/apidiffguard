"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Hook: Esc to collapse + lock body scroll while expanded. */
export function useExpandOverlay(expanded: boolean, onCollapse: () => void) {
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCollapse();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, onCollapse]);
}

export function ExpandToggleButton({
  expanded,
  onToggle,
  label = "Expand",
}: {
  expanded: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? "Exit expanded view" : `${label} to full screen`}
      title={expanded ? "Exit (Esc)" : "Expand (full screen)"}
    >
      {expanded ? (
        <Minimize2 className="size-3.5" />
      ) : (
        <Maximize2 className="size-3.5" />
      )}
      <span className="hidden sm:inline">{expanded ? "Exit" : label}</span>
    </Button>
  );
}

/**
 * Wraps a panel with an Expand control. Expanded view portals a near-fullscreen
 * shell (Esc / Exit to collapse).
 */
export function ExpandablePanel({
  title,
  children,
  className,
  bodyClassName,
  headerExtra,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerExtra?: React.ReactNode;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const collapse = React.useCallback(() => setExpanded(false), []);
  useExpandOverlay(expanded, collapse);

  React.useEffect(() => setMounted(true), []);

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="flex items-center gap-1">
        {headerExtra}
        <ExpandToggleButton
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border",
          className
        )}
      >
        {header}
        <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
          {children}
        </div>
      </div>

      {mounted && expanded
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${title} expanded`}
              className="fixed inset-0 z-50 flex flex-col bg-background"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Expanded view · press Esc to exit
                  </p>
                </div>
                <ExpandToggleButton expanded onToggle={collapse} />
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                {children}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/** Full-viewport shell used by JsonTextarea and dual-editor expand. */
export function ExpandOverlayShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  useExpandOverlay(true, onClose);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} expanded`}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            Expanded view · press Esc to exit
          </p>
        </div>
        <ExpandToggleButton expanded onToggle={onClose} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-border px-4 py-2">{footer}</div>
      ) : null}
    </div>,
    document.body
  );
}
