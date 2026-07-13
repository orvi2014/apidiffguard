import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "API tokens" };

export default function TokensPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">API tokens</h2>
        <p className="mt-1 text-sm text-muted">
          Authenticate a future CLI and public REST API.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface px-4 py-6 text-center">
        <p className="text-sm text-muted">
          Personal access tokens are not available yet. Use the signed-in
          console for baselines, checks, and schedules. See{" "}
          <Link href="/docs/api" className="text-foreground underline-offset-4 hover:underline">
            API status
          </Link>{" "}
          for what exists today.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/docs/api">API docs</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/settings/billing">Billing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
