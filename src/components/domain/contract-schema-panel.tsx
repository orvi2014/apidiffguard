"use client";

import * as React from "react";
import { clearEndpointContract } from "@/app/actions/api-tokens";
import { Button } from "@/components/ui/button";

export function ContractSchemaPanel({
  endpointId,
  schema,
  canEdit,
}: {
  endpointId: string;
  schema: Record<string, unknown> | null;
  canEdit: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const preview = schema
    ? JSON.stringify(schema, null, 2).slice(0, 2400)
    : null;

  return (
    <section className="border-b border-border px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">OpenAPI contract</h2>
          <p className="mt-1 text-xs text-muted">
            Live responses are validated against this schema when present.
          </p>
        </div>
        {canEdit && schema ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-danger"
            onClick={async () => {
              setError(null);
              const result = await clearEndpointContract(endpointId);
              if (result.error) setError(result.error);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {!schema ? (
        <p className="mt-3 text-xs text-muted">
          No response schema stored. Import from OpenAPI or leave empty for
          baseline-only diffs.
        </p>
      ) : (
        <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">
          {preview}
          {preview && preview.length >= 2400 ? "\n…" : null}
        </pre>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
