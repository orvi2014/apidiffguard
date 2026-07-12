import Link from "next/link";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/tokens", label: "API tokens" },
  { href: "/settings/profile", label: "Profile" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-44">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {sections.map((s) => (
            <SettingsLink key={s.href} {...s} />
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SettingsLink({
  href,
  label,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm text-muted whitespace-nowrap transition-colors hover:bg-surface hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
