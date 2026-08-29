"use client";

import { useSearchParams } from "next/navigation";
import { GitHubSignIn } from "@/components/auth/github-sign-in";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const initialError =
    searchParams.get("error") === "auth"
      ? "GitHub sign-in failed. If this keeps happening, the GitHub provider may not be enabled in Supabase Auth."
      : null;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Monitor APIs. Catch drift before production.
      </p>

      <div className="mt-8">
        <GitHubSignIn next={next} initialError={initialError} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        No account yet? Signing in creates your workspace.
      </p>
    </div>
  );
}
