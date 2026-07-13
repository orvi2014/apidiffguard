import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-white">
          A
        </span>
        APIDiffGuard
      </Link>
      <ForgotPasswordForm />
    </div>
  );
}
