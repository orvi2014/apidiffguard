import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-muted">
          We&apos;ll email you a reset link.
        </p>
        <form className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" required />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
