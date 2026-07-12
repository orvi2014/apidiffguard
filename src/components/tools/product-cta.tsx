import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductCta({
  title = "Need automatic API change monitoring?",
  body = "APIDiffGuard captures baselines, diffs live responses, and alerts your team before integrations break.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <aside className="mt-10 rounded-lg border border-border bg-surface px-5 py-5 sm:px-6">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/register">
          <Button size="sm" className="gap-1.5">
            Try APIDiffGuard free
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
        <Link href="/pricing">
          <Button size="sm" variant="secondary">
            View pricing
          </Button>
        </Link>
      </div>
    </aside>
  );
}

export function ToolFaq({
  items,
}: {
  items: Array<{ q: string; a: string }>;
}) {
  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="text-lg font-semibold tracking-tight">FAQ</h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div key={item.q}>
            <dt className="text-sm font-medium">{item.q}</dt>
            <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
