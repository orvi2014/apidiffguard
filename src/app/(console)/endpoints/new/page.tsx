"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createEndpoint } from "@/app/actions/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthOption = "none" | "bearer" | "api_key" | "basic" | "oauth" | "custom";

export default function NewEndpointPage() {
  const [pending, startTransition] = useTransition();
  const [auth, setAuth] = useState<AuthOption>("none");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <Link href="/endpoints" className="text-xs text-muted hover:text-foreground">
        ← Endpoints
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        New endpoint
      </h1>
      <p className="mt-1 text-sm text-muted">
        Register a URL to capture baselines and schedule checks.
      </p>

      <form
        className="mt-8 space-y-5"
        action={(formData) => {
          startTransition(async () => {
            setError(null);
            const result = await createEndpoint(formData);
            if (result?.error) setError(result.error);
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="List Users" required />
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              name="method"
              className="flex h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              defaultValue="GET"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              placeholder="https://api.example.com/v1/users"
              className="font-mono text-xs"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="env">Environment</Label>
            <Input id="env" name="env" defaultValue="production" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth">Auth</Label>
            <select
              id="auth"
              name="auth"
              className="flex h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={auth}
              onChange={(e) => setAuth(e.target.value as AuthOption)}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer token</option>
              <option value="api_key">API key</option>
              <option value="basic">Basic auth</option>
              <option value="oauth">OAuth token</option>
              <option value="custom">Custom headers</option>
            </select>
          </div>
        </div>

        {auth === "bearer" || auth === "oauth" ? (
          <div className="space-y-1.5">
            <Label htmlFor="auth_token">
              {auth === "oauth" ? "Access token" : "Bearer token"}
            </Label>
            <Input
              id="auth_token"
              name="auth_token"
              type="password"
              autoComplete="off"
              required
              className="font-mono text-xs"
            />
          </div>
        ) : null}

        {auth === "api_key" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth_header">Header name</Label>
              <Input
                id="auth_header"
                name="auth_header"
                defaultValue="X-API-Key"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth_key">API key</Label>
              <Input
                id="auth_key"
                name="auth_key"
                type="password"
                autoComplete="off"
                required
                className="font-mono text-xs"
              />
            </div>
          </div>
        ) : null}

        {auth === "basic" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth_username">Username</Label>
              <Input id="auth_username" name="auth_username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth_password">Password</Label>
              <Input
                id="auth_password"
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
              <Label htmlFor="auth_header">Header name</Label>
              <Input
                id="auth_header"
                name="auth_header"
                placeholder="Authorization"
                required
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth_value">Header value</Label>
              <Input
                id="auth_value"
                name="auth_value"
                type="password"
                autoComplete="off"
                required
                className="font-mono text-xs"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Input id="desc" name="desc" placeholder="Optional notes for the team" />
        </div>

        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create endpoint"}
          </Button>
          <Link href="/endpoints">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
