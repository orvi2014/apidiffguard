"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGitHub, signUp } from "@/app/actions/auth";

export function RegisterForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your workspace
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free for 3 endpoints. No credit card.
      </p>

      <form
        className="mt-8"
        action={async () => {
          setPending(true);
          setError(null);
          const result = await signInWithGitHub();
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={pending}
        >
          Continue with GitHub
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted">
          or email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-4"
        action={async (fd) => {
          setPending(true);
          setError(null);
          const result = await signUp(fd);
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Alex Rivera" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workspace">Workspace name</Label>
          <Input id="workspace" name="workspace" placeholder="Acme" />
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
