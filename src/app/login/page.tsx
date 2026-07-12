import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-white">
          A
        </span>
        APIDiffGuard
      </Link>
      <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
