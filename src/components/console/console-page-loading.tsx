import { Skeleton } from "@/components/ui/skeleton";

export function ConsolePageLoading({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col animate-in fade-in duration-200"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-0 overflow-hidden px-5 py-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid gap-3 border-b border-border-subtle py-3.5"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full max-w-[10rem]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsoleFormLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 animate-in fade-in duration-200 sm:px-5 sm:py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4 border border-border bg-surface p-5">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
