import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reset password",
  description: "Request a password reset link for your APIDiffGuard account.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <BrandLogo withWordmark size={24} priority />
      </Link>
      <ForgotPasswordForm />
    </div>
  );
}
