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
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="timeout">Default timeout (ms)</Label>
          <Input id="timeout" defaultValue="10000" className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retries">Retry failed checks</Label>
          <Input id="retries" defaultValue="2" className="font-mono" />
        </div>
        <div className="flex items-center justify-between border-y border-border py-3">
          <div>
            <div className="text-sm">Fail CI on breaking</div>
            <div className="text-xs text-muted">
              Default for apidiff check --fail-on
            </div>
          </div>
          <span className="rounded bg-success-muted px-2 py-0.5 text-[11px] text-success">
            Enabled
          </span>
        </div>
        <Button>Save changes</Button>
      </div>
    </div>
  );
}
