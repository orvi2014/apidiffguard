"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { addIgnoreRule, deleteIgnoreRule } from "@/app/actions/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";

export type IgnoreRuleRow = {
  id: string;
  path: string;
  reason: string | null;
};

export function IgnoreRulesPanel({
  endpointId,
  rules,
  canEdit,
}: {
  endpointId: string;
  rules: IgnoreRuleRow[];
  canEdit: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);

  return (
    <section className="border-b border-border px-5 py-5">
      <h2 className="text-sm font-medium">Ignore rules</h2>
      <p className="mt-1 text-xs text-muted">
        Skip volatile paths during checks (in addition to built-in{" "}
        <span className="font-mono">request_id</span>,{" "}
        <span className="font-mono">timestamp</span>, …).
      </p>

      {rules.length === 0 ? (
        <p className="mt-3 text-xs text-muted">No custom ignore rules.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs">{rule.path}</p>
                {rule.reason ? (
                  <p className="text-[11px] text-muted">{rule.reason}</p>
                ) : null}
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  aria-label={`Delete ignore rule ${rule.path}`}
                  onClick={async () => {
                    setError(null);
                    const result = await deleteIgnoreRule(endpointId, rule.id);
                    if (result.error) setError(result.error);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          action={async (fd) => {
            setError(null);
            const path = String(fd.get("path") ?? "");
            const reason = String(fd.get("reason") ?? "");
            const result = await addIgnoreRule(endpointId, path, reason);
            if (result.error) setError(result.error);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="ignore-path" className="text-[11px]">
              Path
            </Label>
            <Input
              id="ignore-path"
              name="path"
              placeholder="data.meta.request_id"
              className="font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ignore-reason" className="text-[11px]">
              Reason
            </Label>
            <Input
              id="ignore-reason"
              name="reason"
              placeholder="Volatile"
              className="text-xs"
            />
          </div>
          <div className="flex items-end">
            <PendingSubmitButton size="sm" pendingLabel="Adding…">
              Add
            </PendingSubmitButton>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
