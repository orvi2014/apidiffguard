import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">Billing</h2>
        <p className="mt-1 text-sm text-muted">
          You are on the Pro plan.
        </p>
      </div>

      <div className="border border-border bg-surface px-5 py-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm text-muted">Current plan</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">Pro</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-semibold">$49</div>
            <div className="text-xs text-muted">/ month</div>
          </div>
        </div>
        <ul className="mt-5 space-y-1.5 text-sm text-muted">
          <li>100 endpoints</li>
          <li>Unlimited baselines</li>
          <li>CLI + OpenAPI import</li>
          <li>Priority alerts</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <Link href="/pricing">
            <Button variant="secondary" size="sm">
              Change plan
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            Manage payment
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium">Usage this period</h3>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {[
            ["Endpoints", "17 / 100"],
            ["Checks", "1,240"],
            ["Alerts", "84"],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {v}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
