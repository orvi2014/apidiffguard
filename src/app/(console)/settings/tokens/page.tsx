import { Button } from "@/components/ui/button";

export const metadata = { title: "API tokens" };

const tokens = [
  {
    name: "CI pipeline",
    prefix: "adg_live_8f2a…",
    lastUsed: "2h ago",
    created: "Mar 12, 2026",
  },
  {
    name: "Local CLI",
    prefix: "adg_live_91bc…",
    lastUsed: "12m ago",
    created: "Jun 1, 2026",
  },
];

export default function TokensPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">API tokens</h2>
          <p className="mt-1 text-sm text-muted">
            Authenticate the CLI and REST API.
          </p>
        </div>
        <Button size="sm">Create token</Button>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {tokens.map((t) => (
          <li
            key={t.prefix}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-0.5 font-mono text-xs text-muted">
                {t.prefix}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Created {t.created} · Last used {t.lastUsed}
              </div>
            </div>
            <Button size="sm" variant="destructive">
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
