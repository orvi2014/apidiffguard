import { cn } from "@/lib/utils";

/**
 * The one console page header.
 *
 * Before this existed every route invented its own container: `px-5 py-5`,
 * `px-5 py-4`, `px-5 py-8`, `px-5 py-10`, `max-w-lg`, `max-w-3xl`, and two
 * pages with no container at all — plus an `h1` that was `text-xl` on nine
 * pages and `text-lg` in settings. In Operate mode that inconsistency is the
 * defect: the eye relearns where the title sits on every navigation.
 *
 * The values here are not new. They are the majority pattern, which is also
 * the one DESIGN.md specifies — Headline at `1.25rem`, sections at `20px`.
 */
export function PageHeader({
  title,
  description,
  actions,
  /** A caveat or state note. Sits under the title block, not beside the actions. */
  note,
  /** Full-width slot below the title row — status messages, metric strips. */
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  note?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("border-b border-border px-4 py-5 sm:px-5", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
      {children}
    </header>
  );
}

/**
 * The focused shell — forms and single-object pages.
 *
 * Full-bleed is right for lists and wrong for a form: an input stretched to
 * 1440px is unreadable. But the three focused pages had each picked a
 * different measure (`max-w-xl` on new endpoint, `max-w-3xl` on channels and
 * baselines) and three different paddings. One measure, one padding.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-5 sm:py-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Column headers for a list region.
 *
 * Pulled out of the pages because it must not render above an empty table —
 * the alerts page showed CHANNEL / SEVERITY / MESSAGE / STATUS / WHEN over
 * zero rows, which promises data that is not there.
 */
export function ListHeader({
  columns,
  className,
}: {
  columns: { label: string; className?: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden border-b border-border-subtle px-5 py-2 text-xs uppercase tracking-wider text-muted sm:grid sm:gap-4",
        className
      )}
    >
      {columns.map((c) => (
        <span key={c.label} className={c.className}>
          {c.label}
        </span>
      ))}
    </div>
  );
}
