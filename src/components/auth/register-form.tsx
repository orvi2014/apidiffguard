"use client";

import { useSearchParams } from "next/navigation";
import { GitHubSignIn } from "@/components/auth/github-sign-in";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const plan = searchParams.get("plan") ?? "";
  const interval = searchParams.get("interval") === "year" ? "year" : null;

  // A visitor who picked a plan on /pricing lands on billing with that plan
  // preselected once GitHub sends them back, rather than on a dashboard that
  // has forgotten what they came for. The billing period travels with it —
  // dropping it silently billed a yearly signup monthly.
  const destination = plan
    ? `/settings/billing?upgrade=${encodeURIComponent(plan)}${
        interval ? `&interval=${interval}` : ""
      }`
    : next;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your workspace
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free for 3 endpoints. No credit card.
      </p>

      <div className="mt-8">
        <GitHubSignIn next={destination} label="Sign up with GitHub" />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Your workspace is named after your GitHub account. Rename it any time in
        Settings.
      </p>
    </div>
  );
}
