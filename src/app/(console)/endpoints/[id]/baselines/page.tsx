import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatBytes, formatMs, formatRelativeTime } from "@/lib/utils";

export default async function BaselinesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id, name")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!endpoint) notFound();

  const { data: list } = await supabase
    .from("baselines")
    .select(
      "id, version, status_code, response_time, content_size, notes, approved, is_active, created_at"
    )
    .eq("endpoint_id", id)
    .order("version", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/endpoints" className="hover:text-foreground">
          Endpoints
        </Link>
        <span>/</span>
        <Link href={`/endpoints/${id}`} className="hover:text-foreground">
          {endpoint.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Baselines</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Baseline history
          </h1>
          <p className="mt-1 text-sm text-muted">
            Versioned response snapshots for {endpoint.name}
          </p>
        </div>
        <Link href={`/endpoints/${id}`}>
          <Button size="sm">Capture new</Button>
        </Link>
      </div>

      {!list?.length ? (
        <div className="mt-8 border-y border-border py-12 text-center text-sm text-muted">
          No baselines captured yet for this endpoint.
        </div>
      ) : (
        <div className="mt-8 divide-y divide-border border-y border-border">
          {list.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    v{b.version}
                  </span>
                  {b.is_active ? (
                    <span className="rounded bg-accent-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">
                  HTTP {b.status_code} · {formatMs(b.response_time)} ·{" "}
                  {formatBytes(b.content_size)}
                </p>
                {b.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{b.notes}</p>
                ) : null}
              </div>
              <time className="text-[11px] text-muted-foreground">
                {formatRelativeTime(b.created_at)}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
