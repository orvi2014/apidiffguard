import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateProfile } from "@/app/actions/settings";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
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
        </div>
        <Button type="submit">Save profile</Button>
      </form>
    </div>
  );
}
