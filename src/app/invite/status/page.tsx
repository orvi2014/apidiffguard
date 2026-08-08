import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";

export const metadata = { title: "Workspace invite" };

const COPY: Record<string, { title: string; body: string; success?: boolean }> = {
  accepted: {
    title: "You're in",
    body: "The workspace has been added to your account and is now selected.",
    success: true,
  },
  "already-member": {
    title: "Already a member",
    body: "You already belong to this workspace — nothing changed.",
    success: true,
  },
  "already-accepted": {
    title: "Invite already used",
    body: "This invite has already been accepted. Ask an admin for a new one if you still need access.",
  },
  expired: {
    title: "Invite expired",
    body: "Invites are valid for seven days. Ask an admin to send a new one.",
  },
  invalid: {
    title: "Invite not found",
    body: "This link isn't valid. It may have been revoked or replaced by a newer invite.",
  },
  "wrong-account": {
    title: "Wrong account",
    body: "This invite was issued to a different email address. Sign in with the invited address and open the link again.",
  },
  unauthenticated: {
    title: "Sign in to continue",
    body: "You need to be signed in to accept an invite.",
  },
  "seat-limit": {
    title: "Workspace is full",
    body: "This workspace has used every seat on its plan. Ask an admin to upgrade or free a seat.",
  },
};

export default async function InviteStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const copy = COPY[state ?? "invalid"] ?? COPY.invalid;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <BrandLogo size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted">{copy.body}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {copy.success ? "Go to the workspace" : "Back to the console"}
        </Link>
      </div>
    </main>
  );
}
