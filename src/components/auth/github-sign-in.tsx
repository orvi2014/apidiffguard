"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { signInWithGitHub } from "@/app/actions/auth";

/**
 * The only way into the app.
 *
 * Sign-in and sign-up are the same action: GitHub tells us the account is
 * real and the address is verified, and the database trigger creates the
 * workspace on first arrival. So there is no separate "register" call to
 * make, and the two pages differ only in the copy around this button and
 * where they send you afterwards.
 */
export function GitHubSignIn({
  next,
  label = "Continue with GitHub",
  initialError = null,
}: {
  next: string;
  label?: string;
  initialError?: string | null;
}) {
  const [error, setError] = React.useState<string | null>(initialError);
  const [pending, setPending] = React.useState(false);

  return (
    <div>
      <form
        action={async (fd) => {
          setPending(true);
          setError(null);
          fd.set("next", next);
          const result = await signInWithGitHub(fd);
          // A successful start redirects, so reaching here at all is a failure.
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <Button type="submit" className="w-full gap-2" disabled={pending}>
          <GithubIcon />
          {pending ? "Redirecting to GitHub…" : label}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
