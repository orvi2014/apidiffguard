import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to your APIDiffGuard workspace.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <BrandLogo withWordmark size={24} priority />
      </Link>
      <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
