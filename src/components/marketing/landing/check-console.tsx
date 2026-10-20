"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/logo";

/*
 * The hero figure: a scheduled pass over five vendor endpoints, one of which
 * has drifted. Every change in the drawer is something the diff engine
 * actually reports, at the severity severityFor() assigns: a removed field and
 * a value that became null are breaking, a header change is a warning, an
 * added field is info.
 *
 * It starts on the drifted frame, so the server render and a no-JS visit show
 * the finding rather than an idle table, and reduced motion stays there.
 */

const ENDPOINTS = [
  { method: "POST", host: "api.openai.com", path: "/v1/responses", ms: 412 },
  { method: "GET", host: "api.stripe.com", path: "/v1/charges", ms: 188 },
  { method: "GET", host: "api.pipelinecrm.example", path: "/v2/contacts/8812", ms: 236 },
  { method: "GET", host: "shop.myshopify.com", path: "/admin/api/2026-10/orders.json", ms: 301 },
  { method: "GET", host: "api.x.com", path: "/2/users/me", ms: 157 },
];

const DRIFTED = 2;
const RESTING_TICK = 6;

const CHANGES = [
  { sign: "−", path: "data.last_contact_date", note: "removed", label: "breaking", tone: "danger" },
  { sign: "~", path: "data.owner_email", note: "string → null", label: "breaking", tone: "danger" },
  { sign: "~", path: "$header.x-api-version", note: "2 → 3", label: "warning", tone: "warning" },
  { sign: "+", path: "data.lastContactedAt", note: "added", label: "info", tone: "info" },
] as const;

const TONE = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
} as const;

export function CheckConsole() {
  const [tick, setTick] = useState(RESTING_TICK);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1100);
    return () => window.clearInterval(id);
  }, []);

  const cycle = tick % 12;
  const checking = cycle < 5 ? cycle : -1;
  const drifted = cycle >= 3;
  const toast = cycle >= 4;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0b0b0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_60px_140px_-40px_rgba(0,0,0,0.95)]">
      <div className="flex h-11 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4 font-mono text-xs">
        <span className="truncate text-muted-foreground/70">
          <span className="hidden sm:inline">Integrations / </span>Endpoints
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-muted">
          <span aria-hidden className="animate-pulse-dot size-1.5 rounded-full bg-success" />
          scheduled · hourly
        </span>
      </div>

      <div className="grid min-h-[400px] lg:grid-cols-[200px_minmax(0,1fr)_340px]">
        <aside className="hidden border-r border-border-subtle px-3 py-4 text-[13px] lg:block">
          <p className="mx-2 mb-2.5 font-mono text-xs text-muted-foreground/70">Workspace</p>
          <p className="flex justify-between rounded-md bg-white/[0.06] px-2.5 py-1.5">
            Endpoints <span className="font-mono text-muted">5</span>
          </p>
          <p className="mt-0.5 flex justify-between px-2.5 py-1.5 text-muted">
            Diffs
            <span className={`font-mono ${drifted ? "text-danger" : "text-muted-foreground/60"}`}>
              {drifted ? 1 : 0}
            </span>
          </p>
          {["Baselines", "Alert channels", "Ignore rules"].map((item) => (
            <p key={item} className="mt-0.5 px-2.5 py-1.5 text-muted">
              {item}
            </p>
          ))}
        </aside>

        <div className="min-w-0">
          <div className="console-row h-[38px] font-mono text-[11.5px] text-muted-foreground/70">
            <span />
            <span>Method</span>
            <span>Endpoint</span>
            <span className="console-latency text-right">Latency</span>
            <span className="text-right">Last check</span>
          </div>
          {ENDPOINTS.map((e, i) => {
            const isChecking = i === checking;
            const isDrift = i === DRIFTED && drifted && !isChecking;
            return (
              <div
                key={e.host}
                className={`console-row h-[50px] text-[13px] transition-colors duration-500 ${
                  isChecking ? "console-checking bg-accent/5" : isDrift ? "bg-danger/[0.07]" : ""
                }`}
              >
                <span className={`font-mono ${isDrift ? "text-danger" : "text-accent"}`}>
                  {isDrift ? "−" : isChecking ? "~" : ""}
                </span>
                <span className="font-mono text-[11.5px] text-muted">{e.method}</span>
                <span className="min-w-0 truncate font-mono">
                  <span className="text-foreground">{e.host}</span>
                  <span className="text-muted-foreground/60">{e.path}</span>
                </span>
                <span className="console-latency text-right font-mono text-xs text-muted">
                  {e.ms + ((tick * 37 + i * 11) % 29)} ms
                </span>
                <span
                  className={`justify-self-end whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11.5px] ${
                    isChecking
                      ? "bg-accent/15 text-accent-on-wash"
                      : isDrift
                        ? "bg-danger-muted text-danger-on-wash"
                        : "bg-success-muted text-success"
                  }`}
                >
                  {isChecking ? "checking" : isDrift ? "2 breaking" : "no drift"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative min-h-[300px] border-t border-border-subtle bg-[#0d0d10] lg:border-l lg:border-t-0">
          {drifted ? (
            <div className="console-drawer p-[18px]">
              <p className="font-mono text-xs text-muted">
                GET api.pipelinecrm.example/v2/contacts/8812
              </p>
              <p className="mt-1.5 text-[15px] font-semibold tracking-tight">
                2 breaking changes against baseline v12
              </p>
              <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle font-mono text-xs">
                {CHANGES.map((c, i) => (
                  <div
                    key={c.path}
                    className={`console-line flex justify-between gap-2.5 px-3 py-2.5 ${
                      i > 0 ? "border-t border-white/[0.04]" : ""
                    } ${c.tone === "danger" ? "bg-danger/[0.07]" : ""}`}
                    style={{ animationDelay: `${150 + i * 150}ms` }}
                  >
                    <span className={`min-w-0 ${TONE[c.tone]}`}>
                      {c.sign} {c.path}
                      <span className="mt-0.5 block text-muted-foreground/60">{c.note}</span>
                    </span>
                    <span className={TONE[c.tone]}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-1.5 p-[18px] text-center">
              <p className="text-sm text-foreground/85">Checking 5 endpoints</p>
              <p className="font-mono text-xs text-muted-foreground/60">
                diffs land here, graded by severity
              </p>
            </div>
          )}

          {toast && (
            <div className="console-toast absolute inset-x-[18px] bottom-[18px] flex items-start gap-3 rounded-xl border border-border bg-[#17171b] px-3.5 py-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)]">
              <BrandLogo size={28} className="shrink-0" />
              <div>
                <p className="text-xs text-muted">Slack · #integrations</p>
                <p className="mt-0.5 text-[13px] text-foreground">
                  Breaking drift on{" "}
                  <span className="font-mono text-xs">/v2/contacts/8812</span>: a field
                  was removed, another is now null.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
