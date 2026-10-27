"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";

export function useCopy() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(text: string) {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }

  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";
  return { copy, label };
}

export function CopyCommand({ command }: { command: string }) {
  const { copy, label } = useCopy();

  return (
    <span className="inline-flex h-11 max-w-full items-center gap-3 rounded-full border border-border bg-white/[0.04] pl-4 pr-1.5 font-mono text-[13px] text-foreground/85">
      <span className="truncate">
        <span aria-hidden className="text-muted-foreground/60">$ </span>
        {command}
      </span>
      <button
        type="button"
        onClick={() => copy(command)}
        aria-label={`Copy command: ${command}`}
        className="h-8 shrink-0 rounded-full border border-border bg-white/[0.06] px-3 font-sans text-xs font-medium text-foreground transition-colors hover:bg-white/[0.12]"
      >
        <span aria-live="polite">{label}</span>
      </button>
    </span>
  );
}
