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
        <div className="flex items-center justify-between border-y border-border py-3">
          <div>
            <div className="text-sm">Fail CI on breaking</div>
            <div className="text-xs text-muted">
              Intended default when a CLI ships — use console checks today
            </div>
          </div>
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Coming soon
          </span>
        </div>
      </fieldset>
    </div>
  );
}
