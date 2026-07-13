import Link from "next/link";
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
        <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-white">
          A
        </span>
        APIDiffGuard
      </Link>
      <UpdatePasswordForm />
    </div>
  );
}
