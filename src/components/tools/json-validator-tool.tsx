"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { JsonTextarea, parseJsonSafe } from "@/components/tools/json-textarea";
import { cn } from "@/lib/utils";

export function JsonValidatorTool() {
  const [input, setInput] = React.useState(
    '{\n  "status": "ok",\n  "count": 3\n}'
  );
  const parsed = parseJsonSafe(input);
  const hasInput = Boolean(input.trim());
  const valid = hasInput && parsed.value !== undefined;

  return (
    <div className="space-y-4">
      <JsonTextarea
        label="JSON to validate"
        value={input}
        onChange={setInput}
        error={null}
      />
      {hasInput ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-4",
            valid
              ? "border-success/30 bg-success-muted text-success"
              : "border-danger/30 bg-danger-muted text-danger"
          )}
        >
          {valid ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium">
              {valid ? "Valid JSON" : "Invalid JSON"}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {valid
                ? `Parsed successfully as ${Array.isArray(parsed.value) ? "array" : typeof parsed.value}.`
                : parsed.error}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Paste JSON to validate syntax.
        </p>
      )}
    </div>
  );
}
