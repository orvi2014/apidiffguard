import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-5 sm:py-8 md:flex-row md:gap-8">
      <aside className="w-full shrink-0 md:w-44">
        {/* Headline is 1.25rem everywhere else in the console; settings was
            the one page whose title sat a step smaller. */}
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
