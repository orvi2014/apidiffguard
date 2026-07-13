import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Update password",
  description: "Set a new password for your APIDiffGuard account.",
  path: "/update-password",
  noIndex: true,
});

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <BrandLogo withWordmark size={24} priority />
      </Link>
      <UpdatePasswordForm />
    </div>
  );
}
