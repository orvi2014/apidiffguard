"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { JsonTextarea, parseJsonSafe } from "@/components/tools/json-textarea";

export function JsonFormatterTool() {
  const [input, setInput] = React.useState(
    '{"data":{"name":"Alex","tags":["api","json"]},"ok":true}'
  );
  const [indent, setIndent] = React.useState(2);
  const parsed = parseJsonSafe(input);

  const format = () => {
    if (parsed.value === undefined) return;
    setInput(JSON.stringify(parsed.value, null, indent));
  };

  const minify = () => {
    if (parsed.value === undefined) return;
    setInput(JSON.stringify(parsed.value));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={format} disabled={!parsed.value}>
          Pretty print
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={minify}
          disabled={!parsed.value}
        >
          Minify
        </Button>
        <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
          Indent
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="h-7 rounded-md border border-border bg-surface px-2 text-foreground"
          >
            {[2, 4].map((n) => (
              <option key={n} value={n}>
                {n} spaces
              </option>
            ))}
          </select>
        </label>
      </div>
      <JsonTextarea
        label="JSON"
        value={input}
        onChange={setInput}
        error={input.trim() ? parsed.error : null}
      />
      {parsed.value !== undefined ? (
        <p role="status" className="text-xs text-success">
          Valid JSON · ready to format
        </p>
      ) : null}
    </div>
  );
}
