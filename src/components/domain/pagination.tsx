import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Offset pager for list surfaces.
 *
 * These lists previously took a hard `.limit()` with no controls, so anything
 * past the cap silently vanished — the user had no way to tell whether they
 * were seeing everything.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const linkClass =
    "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-[#3f3f46] hover:text-foreground";
  const disabledClass =
    "pointer-events-none border-border-subtle text-muted/40";

  return (
    <nav
      aria-label="Pagination"
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3"
    >
      <p className="text-xs text-muted tabular-nums">
        {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          aria-label="Previous page"
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 && disabledClass)}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Previous
        </Link>

        <span className="text-xs text-muted tabular-nums">
          Page {page} of {totalPages}
        </span>

        <Link
          href={href(page + 1)}
          aria-label="Next page"
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(linkClass, page >= totalPages && disabledClass)}
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

/** Clamp a `?page=` value to a sane positive integer. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}
