"use client";

import { SeverityBadge } from "@/components/domain/badges";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

const changes = [
  {
    path: "data.name",
    severity: "breaking" as const,
  },
  {
    path: "data.full_name",
    severity: "info" as const,
  },
  {
    path: "pagination.per_page",
    severity: "breaking" as const,
  },
  {
    path: "data.profile.timezone",
    severity: "warning" as const,
  },
];

export function ProductDemo() {
  return (
    <BlurFade delay={0.15} className="relative mx-auto mt-14 w-full max-w-5xl">
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <BorderBeam
          size={120}
          duration={8}
          colorFrom="#4F7FFF"
          colorTo="#22c55e"
          borderWidth={1.5}
        />
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#3f3f46]" />
            <span className="size-2.5 rounded-full bg-[#3f3f46]" />
            <span className="size-2.5 rounded-full bg-[#3f3f46]" />
          </div>
          <div className="ml-3 flex items-center gap-2 text-[11px] text-muted">
            <span>List Users</span>
            <span className="text-border">/</span>
            <span className="font-mono text-foreground">diff · baseline v4</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[11px]">
            <span className="font-mono text-danger">2 breaking</span>
            <span className="font-mono text-warning">1 warning</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr_1fr]">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border-subtle px-3 py-2 text-[10px] uppercase tracking-wider text-muted">
              Changes
            </div>
            {changes.map((c, i) => (
              <BlurFade
                key={c.path}
                delay={0.25 + i * 0.08}
                className={cn(
                  "border-b border-border-subtle px-3 py-2.5",
                  i === 0 && "bg-accent-muted"
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <SeverityBadge severity={c.severity} />
                </div>
                <div className="truncate font-mono text-[11px] text-foreground">
                  {c.path}
                </div>
              </BlurFade>
            ))}
          </div>

          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="flex h-8 items-center justify-between border-b border-border-subtle bg-background/40 px-3">
              <span className="text-[11px] text-muted">Old response</span>
              <span className="font-mono text-[10px] text-danger/70">
                baseline
              </span>
            </div>
            <pre className="overflow-hidden p-3 font-mono text-[11px] leading-5 text-muted">
              <code>
                {`{
  "data": {
`}
                <span className="bg-danger-muted text-danger">
                  {`    "name": "Alex Rivera",`}
                </span>
                {`
    "role": "admin",
    "profile": {
      "timezone": `}
                <span className="bg-warning-muted text-warning">
                  &quot;America/New_York&quot;
                </span>
                {`
    }
  },
  "pagination": { "per_page": `}
                <span className="bg-danger-muted text-danger">20</span>
                {` }
}`}
              </code>
            </pre>
          </div>

          <div>
            <div className="flex h-8 items-center justify-between border-b border-border-subtle bg-background/40 px-3">
              <span className="text-[11px] text-muted">New response</span>
              <span className="font-mono text-[10px] text-success/70">live</span>
            </div>
            <pre className="overflow-hidden p-3 font-mono text-[11px] leading-5 text-muted">
              <code>
                {`{
  "data": {
`}
                <span className="bg-success-muted text-success">
                  {`    "full_name": "Alex Rivera",`}
                </span>
                {`
    "role": "admin",
    "profile": {
      "timezone": `}
                <span className="bg-warning-muted text-warning">
                  &quot;America/Los_Angeles&quot;
                </span>
                {`
    }
  },
  "pagination": { "per_page": `}
                <span className="bg-danger-muted text-danger">25</span>
                {` }
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </BlurFade>
  );
}
