import Link from "next/link";
import { Check } from "lucide-react";
import { updateWorkspacePlan } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { getPlan, PLANS, type PlanId } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; error?: string; upgrade?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) return null;

  const plan = getPlan(ctx.plan);
  const supabase = await createClient();
  const { count: endpointCount } = await supabase
    .from("endpoints")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId);

  const endpoints = endpointCount ?? 0;
  const limit = plan.endpointLimit;
  const usageLabel =
    limit == null ? `${endpoints} / ∞` : `${endpoints} / ${limit}`;

  const canManage = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const highlightUpgrade = params.upgrade as PlanId | undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h2 className="text-base font-medium">Billing</h2>
        <p className="mt-1 text-sm text-muted">
          You are on the {plan.name} plan
          {canManage ? "." : " (ask an admin to change plans)."}
        </p>
      </div>

      {params.upgraded ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground"
        >
          Plan updated to {getPlan(params.upgraded as PlanId).name}. Baselines
          and checks keep working on the new limits.
        </p>
      ) : null}

      {params.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
        >
          {params.error === "forbidden"
            ? "Only workspace owners and admins can change the plan."
            : params.error === "invalid-plan"
              ? "That plan is not available for self-serve upgrade."
              : "Could not update the plan. Try again."}
        </p>
      ) : null}

      <section
        aria-labelledby="current-plan-heading"
        className="border border-border bg-surface px-4 py-5 sm:px-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h3 id="current-plan-heading" className="text-sm text-muted">
              Current plan
            </h3>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {plan.name}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-2xl font-semibold">
              {plan.priceLabel}
            </div>
            {plan.period ? (
              <div className="text-xs text-muted">{plan.period}</div>
            ) : null}
          </div>
        </div>
        <ul className="mt-5 space-y-1.5 text-sm text-muted">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-3.5 shrink-0 text-accent"
                aria-hidden
              />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href="#plans">
            <Button variant="secondary" size="sm">
              Change plan
            </Button>
          </a>
          <Button variant="ghost" size="sm" disabled title="Stripe billing coming soon">
            Manage payment
          </Button>
        </div>
      </section>

      <section aria-labelledby="usage-heading">
        <h3 id="usage-heading" className="text-sm font-medium">
          Usage this period
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums">
              {usageLabel}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted">
              Endpoints
            </div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums">—</div>
            <div className="text-[11px] uppercase tracking-wider text-muted">
              Checks
            </div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums">—</div>
            <div className="text-[11px] uppercase tracking-wider text-muted">
              Alerts
            </div>
          </div>
        </div>
      </section>

      <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-8">
        <h3 id="plans-heading" className="text-sm font-medium">
          Choose a plan
        </h3>
        <p className="mt-1 text-sm text-muted">
          Self-serve plans update your workspace immediately. Team plans need a
          conversation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLANS.map((p) => {
            const current = p.id === ctx.plan;
            const ring =
              highlightUpgrade === p.id || p.highlighted
                ? "ring-1 ring-inset ring-accent/40"
                : "";
            return (
              <article
                key={p.id}
                className={`flex flex-col border border-border bg-background p-4 ${ring}`}
                aria-current={current ? "true" : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium">{p.name}</h4>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-sm font-semibold">
                    {p.priceLabel}
                    {p.period ? (
                      <span className="block text-[10px] font-normal text-muted">
                        {p.period}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted">
                      <Check className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {p.contactOnly ? (
                    <Button asChild variant="secondary" size="sm" className="w-full">
                      <a href="mailto:hello@apidiffguard.com?subject=APIDiffGuard%20Team%20plan">
                        Talk to us
                      </a>
                    </Button>
                  ) : current ? (
                    <Button size="sm" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : canManage ? (
                    <form action={updateWorkspacePlan}>
                      <input type="hidden" name="plan" value={p.id} />
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full min-h-9"
                        variant={p.highlighted ? "default" : "secondary"}
                      >
                        {planRank(p.id) > planRank(ctx.plan)
                          ? `Upgrade to ${p.name}`
                          : `Switch to ${p.name}`}
                      </Button>
                    </form>
                  ) : (
                    <Button size="sm" className="w-full" disabled>
                      Ask an admin
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">
          Looking for public pricing copy?{" "}
          <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground">
            View pricing page
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function planRank(id: PlanId): number {
  const order: PlanId[] = ["free", "starter", "pro", "team"];
  return order.indexOf(id);
}
