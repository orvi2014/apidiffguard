import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">General</h2>
        <p className="mt-1 text-sm text-muted">
          Default check behavior for this workspace.
        </p>
        <p
          role="status"
          className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
        >
          Coming soon — these defaults are not persisted yet. Checks currently
          use a built-in request timeout (no automatic retries yet).
        </p>
      </div>
      <fieldset disabled className="space-y-4 opacity-70">
        <legend className="sr-only">General defaults (read-only)</legend>
        <div className="space-y-1.5">
          <Label htmlFor="timeout">Default timeout (ms)</Label>
          <Input id="timeout" defaultValue="10000" className="font-mono" readOnly />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retries">Retry failed checks</Label>
          <Input id="retries" defaultValue="2" className="font-mono" readOnly />
        </div>
        </fieldset>

      {/* Pulled out of the disabled fieldset: this works today, and reading as
          greyed-out placeholder meant people skipped past a shipped feature. */}
      <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm">Fail CI on breaking changes</div>
            <div className="mt-0.5 text-xs text-muted">
              Available now — gate a pipeline with an API token and the CLI, or
              call the REST API directly.
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/settings/tokens">Create a token</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/docs/cli">CLI docs</Link>
            </Button>
          </div>
        </div>
      </div>
      <fieldset disabled className="hidden">
      </fieldset>
    </div>
  );
}
