import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateProfile } from "@/app/actions/settings";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", ctx.userId)
    .maybeSingle();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted">
          Your personal account details.
        </p>
      </div>
      {params.saved ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
        >
          Profile saved.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
        >
          {params.error === "name"
            ? "Name is required."
            : "Could not save profile. Try again."}
        </p>
      ) : null}
      <form action={updateProfile} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={profile?.name ?? ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={profile?.email ?? ctx.email}
            disabled
          />
          <p className="text-[11px] text-muted">
            Email is managed by your sign-in provider and cannot be changed
            here.
          </p>
        </div>
        <PendingSubmitButton type="submit" pendingLabel="Saving…">
          Save profile
        </PendingSubmitButton>
      </form>
    </div>
  );
}
