"use client";

import * as React from "react";
import { createApiToken, revokeApiToken } from "@/app/actions/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmSubmitButton } from "@/components/form/confirm-submit-button";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { formatRelativeTime } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";
import { DEFAULT_SCOPES, type ApiScope } from "@/lib/api-scopes";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  scopes?: string[] | null;
};

const SCOPE_OPTIONS: Array<{ value: ApiScope; label: string; hint: string }> = [
  {
    value: "endpoints:read",
    label: "Read endpoints",
    hint: "List and inspect endpoint configuration.",
  },
  {
    value: "endpoints:write",
    label: "Create endpoints",
    hint: "Register endpoints, including their stored credentials.",
  },
  {
    value: "checks:run",
    label: "Run checks",
    hint: "Trigger checks, which makes outbound requests and can fire alerts.",
  },
  {
    value: "baselines:write",
    label: "Write baselines",
    hint: "Promote a response to the active baseline.",
  },
];

export function ApiTokensManager({
  keys,
  canEdit,
}: {
  keys: KeyRow[];
  canEdit: boolean;
}) {
  const [createdToken, setCreatedToken] = React.useState<string | null>(null);

  // The plaintext token is shown exactly once. The page renders doc links right
  // below it, so a click before copying loses the value permanently.
  React.useEffect(() => {
    if (!createdToken) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [createdToken]);
  const [error, setError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<
    "idle" | "copied" | "failed"
  >("idle");

  return (
    <div className="space-y-8">
      {canEdit ? (
        <form
          className="space-y-3 rounded-md border border-border bg-surface p-4"
          action={async (fd) => {
            setError(null);
            setCreatedToken(null);
            const result = await createApiToken(fd);
            if (result.error) {
              setError(result.error);
              return;
            }
            if ("token" in result && result.token) {
              setCreatedToken(result.token);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="token-name">Token name</Label>
            <Input
              id="token-name"
              name="name"
              placeholder="CI · production checks"
              maxLength={80}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Scopes</legend>
            <p className="text-xs text-muted">
              Grant only what this token needs. Unticked capabilities are
              rejected at the API.
            </p>
            {SCOPE_OPTIONS.map((scope) => (
              <label
                key={scope.value}
                className="flex items-start gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope.value}
                  defaultChecked={DEFAULT_SCOPES.includes(scope.value)}
                  className="mt-1 size-3.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block">{scope.label}</span>
                  <span className="block text-xs text-muted">{scope.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <PendingSubmitButton size="sm" pendingLabel="Creating…">
            Create token
          </PendingSubmitButton>
        </form>
      ) : (
        <p className="text-sm text-muted">Viewers cannot create tokens.</p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {createdToken ? (
        <div
          role="status"
          className="space-y-2 rounded-md border border-warning/40 bg-warning-muted px-4 py-3"
        >
          <p className="text-sm font-medium text-warning">
            Copy this token now — it won’t be shown again.
          </p>
          <code className="block break-all rounded bg-background px-3 py-2 font-mono text-xs">
            {createdToken}
          </code>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                const ok = await copyText(createdToken);
                setCopyState(ok ? "copied" : "failed");
                setTimeout(() => setCopyState("idle"), 2000);
              }}
            >
              {copyState === "copied" ? "Copied" : "Copy token"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                // The token is unrecoverable once this panel closes, so make
                // dismissing it deliberate rather than a stray click.
                if (
                  confirm(
                    "Dismiss this token? It cannot be shown again — make sure you have copied it."
                  )
                ) {
                  setCreatedToken(null);
                  setCopyState("idle");
                }
              }}
            >
              I’ve saved it
            </Button>
          </div>

          {/* Announced politely so screen readers hear the result of the copy. */}
          <p aria-live="polite" className="text-xs text-muted">
            {copyState === "copied"
              ? "Token copied to clipboard."
              : copyState === "failed"
                ? "Couldn’t copy automatically — select the token above and copy it manually."
                : ""}
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-medium">Active tokens</h3>
        {keys.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No tokens yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {key.prefix}… · created {formatRelativeTime(key.created_at)}
                    {key.last_used_at
                      ? ` · last used ${formatRelativeTime(key.last_used_at)}`
                      : " · never used"}
                  </p>
                  {key.scopes?.length ? (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted"
                        >
                          {scope}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <form
                    action={async () => {
                      await revokeApiToken(key.id);
                    }}
                  >
                    <ConfirmSubmitButton
              confirmMessage="Revoke this token? Anything using it — including CI — stops working immediately, and it cannot be undone."
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      pendingLabel="Revoking…"
                    >
                      Revoke
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted">
        <p className="font-medium text-foreground">Usage</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed">
{`curl -X POST \\
  "$APP_URL/api/v1/endpoints/$ENDPOINT_ID/check" \\
  -H "Authorization: Bearer adg_live_…"`}
        </pre>
      </div>
    </div>
  );
}
