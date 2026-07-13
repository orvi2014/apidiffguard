"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/actions/auth";

export function UpdatePasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-1 text-sm text-muted">
        You&apos;re signed in via the reset link. Set a new password to finish.
      </p>
      <form
        className="mt-8 space-y-4"
        action={async (fd) => {
          setPending(true);
          setError(null);
          const result = await updatePassword(fd);
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-[11px] text-muted">
            At least 8 characters.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            minLength={8}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="hover:text-foreground">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
