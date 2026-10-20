"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useCopy } from "@/components/marketing/landing/copy-command";

type Tab = { label: string; copy: string; code: ReactNode };

const k = (s: string) => <span className="text-accent-on-wash">{s}</span>;
const s = (v: string) => <span className="text-warning">{v}</span>;
const c = (v: string) => <span className="text-muted-foreground/50">{v}</span>;

const CLI_FLAGS =
  '--baseline ./fixtures/contacts.json --url "$CRM_API/v2/contacts/8812" --header "Authorization: Bearer $CRM_TOKEN" --schema-only --fail-on breaking';

const TABS: Tab[] = [
  {
    label: "CLI",
    copy: `npx @apidiffguard/cli check ${CLI_FLAGS}`,
    code: (
      <>
        {c("# diff a live endpoint against a saved baseline")}
        {"\n"}
        {k("npx")} @apidiffguard/cli check \{"\n"}
        {"  "}--baseline ./fixtures/contacts.json \{"\n"}
        {"  "}--url {s('"$CRM_API/v2/contacts/8812"')} \{"\n"}
        {"  "}--header {s('"Authorization: Bearer $CRM_TOKEN"')} \{"\n"}
        {"  "}--schema-only --fail-on breaking
      </>
    ),
  },
  {
    label: "GitHub Actions",
    copy: `- name: Vendor API drift gate
  env:
    CRM_API: \${{ vars.CRM_API }}
    CRM_TOKEN: \${{ secrets.CRM_TOKEN }}
  run: |
    npx --yes @apidiffguard/cli check \\
      --baseline ./fixtures/contacts.json \\
      --url "$CRM_API/v2/contacts/8812" \\
      --header "Authorization: Bearer $CRM_TOKEN" \\
      --schema-only --fail-on breaking`,
    code: (
      <>
        {c("# .github/workflows/vendor-drift.yml")}
        {"\n"}- {k("name")}: Vendor API drift gate{"\n"}
        {"  "}
        {k("env")}:{"\n"}
        {"    "}CRM_API: {s("${{ vars.CRM_API }}")}
        {"\n    "}CRM_TOKEN: {s("${{ secrets.CRM_TOKEN }}")}
        {"\n  "}
        {k("run")}: |{"\n"}
        {"    "}npx --yes @apidiffguard/cli check \{"\n"}
        {"      "}--baseline ./fixtures/contacts.json \{"\n"}
        {"      "}--url {s('"$CRM_API/v2/contacts/8812"')} \{"\n"}
        {"      "}--header {s('"Authorization: Bearer $CRM_TOKEN"')} \{"\n"}
        {"      "}--schema-only --fail-on breaking
      </>
    ),
  },
  {
    label: "REST API",
    copy: 'curl -X POST https://apidiffguard.com/api/v1/endpoints/$ENDPOINT_ID/check -H "Authorization: Bearer $ADG_TOKEN"',
    code: (
      <>
        {c("# run a check on an endpoint you monitor in the cloud")}
        {"\n"}
        {k("curl")} -X POST \{"\n"}
        {"  "}https://apidiffguard.com/api/v1/endpoints/$ENDPOINT_ID/check \{"\n"}
        {"  "}-H {s('"Authorization: Bearer $ADG_TOKEN"')}
      </>
    ),
  },
  {
    label: "Prompt for your agent",
    copy: "For each third-party API this codebase calls, save one known-good response to fixtures/, then add a CI step that runs: npx @apidiffguard/cli check --baseline <fixture> --url <endpoint> --schema-only --fail-on breaking",
    code: (
      <>
        {c("# paste into Claude Code, Cursor or Codex")}
        {"\n"}For each third-party API this codebase calls, save one known-good
        response to fixtures/, then add a CI step that runs:{"\n"}
        npx @apidiffguard/cli check --baseline &lt;fixture&gt; --url &lt;endpoint&gt;
        --schema-only --fail-on breaking
      </>
    ),
  },
];

export function SetupTabs() {
  const [active, setActive] = useState(0);
  const { copy, label } = useCopy();
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = jump ?? (active + step + TABS.length) % TABS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-3 py-2.5">
        <div role="tablist" aria-label="Setup options" className="flex flex-wrap gap-1.5" onKeyDown={onKeyDown}>
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                i === active
                  ? "border-border bg-white/[0.07] text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => copy(TABS[active]!.copy)}
          className="ml-auto h-8 rounded-full border border-border bg-white/[0.06] px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.12]"
        >
          <span aria-live="polite">{label}</span>
        </button>
      </div>
      <pre
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${active}`}
        tabIndex={0}
        className={`overflow-x-auto bg-background px-6 py-5 font-mono text-[13px] leading-[1.85] text-foreground/85 ${
          active === 3 ? "whitespace-pre-wrap" : "whitespace-pre"
        }`}
      >
        <code>{TABS[active]!.code}</code>
      </pre>
    </div>
  );
}
