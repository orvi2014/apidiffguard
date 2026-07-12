"use client";

import Link from "next/link";
import { GitCompare } from "lucide-react";
import { SeverityBadge } from "@/components/domain/badges";
import { ShineBorder } from "@/components/ui/shine-border";
import { formatRelativeTime } from "@/lib/utils";

export function DriftAttentionCard({
  href,
  endpointName,
  breakingCount,
  warningCount,
  baselineVersion,
  createdAt,
}: {
  href: string;
  endpointName: string;
  breakingCount: number;
  warningCount: number;
  baselineVersion?: number | null;
  createdAt: string;
}) {
  return (
    <Link
      href={href}
      className="relative mt-4 block overflow-hidden rounded-lg border border-border bg-surface px-4 py-4 transition-colors hover:border-[#3f3f46] cursor-pointer"
    >
      <ShineBorder
        shineColor={
          breakingCount > 0
            ? ["#ef4444", "#f59e0b", "#ef4444"]
            : ["#f59e0b", "#4F7FFF", "#f59e0b"]
        }
        duration={10}
        borderWidth={1}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded border border-border text-danger">
            <GitCompare className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{endpointName}</span>
              <SeverityBadge
                severity={breakingCount > 0 ? "breaking" : "warning"}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {breakingCount} breaking · {warningCount} warning
              {baselineVersion != null ? ` · baseline v${baselineVersion}` : ""}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatRelativeTime(createdAt)}
        </span>
      </div>
    </Link>
  );
}
