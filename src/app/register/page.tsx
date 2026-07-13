import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Create account — Start free API monitoring",
  description:
    "Create an APIDiffGuard workspace. Free for 3 endpoints. Monitor API responses and catch breaking changes.",
  path: "/register",
  noIndex: true,
});

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-white">
          A
        </span>
        APIDiffGuard
      </Link>
      <Suspense fallback={<div className="w-full max-w-sm text-sm text-muted">Loading…</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
