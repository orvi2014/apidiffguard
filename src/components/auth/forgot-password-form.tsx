"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
      <p className="mt-1 text-sm text-muted">
        We&apos;ll email you a reset link.
      </p>

      {success ? (
        <p
          role="status"
          className="mt-8 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
        >
          If an account exists for that email, a reset link is on the way. Check
          your inbox.
        </p>
      ) : (
        <form
          className="mt-8 space-y-4"
          action={async (fd) => {
            setPending(true);
            setError(null);
            const result = await resetPassword(fd);
            if (result?.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            setSuccess(true);
            setPending(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="hover:text-foreground">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
