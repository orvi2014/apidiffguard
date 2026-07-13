"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateEndpoint } from "@/app/actions/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Endpoint } from "@/lib/types";

type AuthOption = "none" | "bearer" | "api_key" | "basic" | "oauth" | "custom";

export function EndpointEditForm({
  endpoint,
  requestBody = "",
  contentType = "application/json",
  onDone,
}: {
  endpoint: Endpoint;
  requestBody?: string;
  contentType?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [auth, setAuth] = React.useState<AuthOption>(
    (endpoint.authType as AuthOption) || "none"
  );
  const [method, setMethod] = React.useState(endpoint.method);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const needsBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <form
      className="mt-4 space-y-4 rounded-md border border-border bg-surface p-4"
      action={async (fd) => {
        setPending(true);
        setError(null);
        fd.set("id", endpoint.id);
        fd.set("keep_auth", "1");
        const result = await updateEndpoint(fd);
        setPending(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        onDone?.();
        router.refresh();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={endpoint.name} required />
      </div>
      <div className="grid grid-cols-[100px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-method">Method</Label>
          <select
            id="edit-method"
            name="method"
            className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as Endpoint["method"])}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-url">URL</Label>
          <Input
            id="edit-url"
            name="url"
            type="url"
            defaultValue={endpoint.url}
            className="font-mono text-xs"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-env">Environment</Label>
          <Input id="edit-env" name="env" defaultValue={endpoint.environment} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-auth">Auth</Label>
          <select
            id="edit-auth"
            name="auth"
            className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={auth}
            onChange={(e) => setAuth(e.target.value as AuthOption)}
          >
            <option value="none">None</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key">API key</option>
            <option value="basic">Basic auth</option>
            <option value="oauth">Access token</option>
            <option value="custom">Custom headers</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-diff-mode">Diff mode</Label>
        <select
          id="edit-diff-mode"
          name="diff_mode"
          className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          defaultValue={endpoint.diffMode ?? "schema"}
        >
          <option value="schema">Schema only (ignore value churn)</option>
          <option value="full">Full (include value changes)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Schema mode flags structure, types, nullability, and status class —
          not leaf value noise.
        </p>
      </div>

      {auth === "bearer" || auth === "oauth" ? (
        <div className="space-y-1.5">
          <Label htmlFor="edit-auth-token">Token (leave blank to keep)</Label>
          <Input
            id="edit-auth-token"
            name="auth_token"
            type="password"
            autoComplete="off"
            className="font-mono text-xs"
            placeholder="••••••••"
          />
        </div>
      ) : null}
      {auth === "api_key" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-auth-header">Header name</Label>
            <Input
              id="edit-auth-header"
              name="auth_header"
              defaultValue="X-API-Key"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-auth-key">API key (leave blank to keep)</Label>
            <Input
              id="edit-auth-key"
              name="auth_key"
              type="password"
              autoComplete="off"
              className="font-mono text-xs"
              placeholder="••••••••"
            />
          </div>
        </div>
      ) : null}
      {auth === "basic" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-auth-username">Username</Label>
            <Input id="edit-auth-username" name="auth_username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-auth-password">Password</Label>
            <Input
              id="edit-auth-password"
              name="auth_password"
              type="password"
              autoComplete="off"
            />
          </div>
        </div>
      ) : null}
      {auth === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-custom-header">Header name</Label>
            <Input
              id="edit-custom-header"
              name="auth_header"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-custom-value">Header value</Label>
            <Input
              id="edit-custom-value"
              name="auth_value"
              type="password"
              autoComplete="off"
              className="font-mono text-xs"
            />
          </div>
        </div>
      ) : null}

      {needsBody ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="edit-content-type">Content-Type</Label>
            <Input
              id="edit-content-type"
              name="content_type"
              defaultValue={contentType}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-request-body">Request body</Label>
            <textarea
              id="edit-request-body"
              name="request_body"
              defaultValue={requestBody}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              placeholder='{"example": true}'
            />
          </div>
        </>
      ) : (
        <input type="hidden" name="request_body" value="" />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="edit-desc">Description</Label>
        <Input
          id="edit-desc"
          name="desc"
          defaultValue={endpoint.description ?? ""}
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {onDone ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
