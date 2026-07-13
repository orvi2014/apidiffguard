"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  FileJson,
  Link2,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { MethodBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OPENAPI_PRESETS,
  type ParsedOpenAPIEndpoint,
  type ParsedOpenAPISpec,
} from "@/lib/openapi";
import { cn } from "@/lib/utils";

type SourceTab = "url" | "upload" | "paste";

export default function OpenAPIImportPage() {
  return <OpenAPIImportWizard />;
}

function OpenAPIImportWizard() {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [tab, setTab] = React.useState<SourceTab>("url");
  const [url, setUrl] = React.useState<string>(OPENAPI_PRESETS[0].url);
  const [paste, setPaste] = React.useState("");
  const [serverOverride, setServerOverride] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [spec, setSpec] = React.useState<ParsedOpenAPISpec | null>(null);
  const [sourceLabel, setSourceLabel] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState<string | "all">("all");
  const [importing, setImporting] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState<number | null>(null);
  const [skippedCount, setSkippedCount] = React.useState<number | null>(null);
  const [showAllTags, setShowAllTags] = React.useState(false);

  const applySpec = React.useCallback(
    (next: ParsedOpenAPISpec, label: string) => {
      setSpec(next);
      setSourceLabel(label);
      setSelected(new Set(next.endpoints.map((e) => e.id)));
      setServerOverride(next.servers[0] ?? "");
      setQuery("");
      setTagFilter("all");
      setImportedCount(null);
      setSkippedCount(null);
      setError(null);
    },
    []
  );

  const parseContent = async (content: string, label: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/openapi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          serverUrl: serverOverride || undefined,
        }),
      });
      const data = (await res.json()) as {
        spec?: ParsedOpenAPISpec;
        error?: string;
      };
      if (!res.ok || !data.spec) {
        throw new Error(data.error || "Parse failed.");
      }
      applySpec(data.spec, label);
    } catch (err) {
      setSpec(null);
      setError(err instanceof Error ? err.message : "Parse failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUrl = async (targetUrl: string, label?: string) => {
    setLoading(true);
    setError(null);
    try {
      const {
        extractEndpointsFromOpenAPI,
        findSwaggerUiFollowUpUrls,
        looksLikeHtml,
        looksLikeSwaggerInitJs,
        parseOpenAPIContent,
        pickServerForDocsHost,
      } = await import("@/lib/openapi");

      let content: string | null = null;
      let resolvedLabel = label || targetUrl;

      try {
        const direct = await fetch(targetUrl, {
          headers: {
            Accept:
              "application/json, application/javascript, application/yaml, text/yaml, text/html, text/plain, */*",
          },
          cache: "no-store",
        });
        if (direct.ok) content = await direct.text();
      } catch {
        content = null;
      }

      // Swagger UI HTML → follow swagger-ui-init.js (NestJS embeds the full spec there)
      if (content && looksLikeHtml(content)) {
        const candidates = findSwaggerUiFollowUpUrls(content, targetUrl);
        let resolved: string | null = null;
        for (const candidate of candidates) {
          try {
            const res = await fetch(candidate, { cache: "no-store" });
            if (!res.ok) continue;
            const next = await res.text();
            if (
              looksLikeSwaggerInitJs(next) ||
              next.trim().startsWith("{") ||
              next.trim().startsWith("openapi:") ||
              next.trim().startsWith("swagger:")
            ) {
              content = next;
              resolved = candidate;
              break;
            }
          } catch {
            /* try next */
          }
        }
        if (!resolved) {
          throw new Error(
            "That URL is a Swagger UI page. Could not find swagger-ui-init.js or an OpenAPI JSON/YAML link."
          );
        }
        resolvedLabel = label || `Swagger UI → ${resolved}`;
      }

      if (content?.trim()) {
        // Parse in-browser so large NestJS swagger-ui-init.js bundles (~7MB) skip a huge POST
        const document = parseOpenAPIContent(content);
        const initial = extractEndpointsFromOpenAPI(document, {
          serverUrl: serverOverride || undefined,
        });
        const preferred =
          serverOverride ||
          pickServerForDocsHost(initial.servers, targetUrl);
        const nextSpec =
          preferred && preferred !== initial.servers[0]
            ? extractEndpointsFromOpenAPI(document, { serverUrl: preferred })
            : initial;
        applySpec(nextSpec, resolvedLabel);
        return;
      }

      const res = await fetch("/api/openapi/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          serverUrl: serverOverride || undefined,
        }),
      });
      const data = (await res.json()) as {
        spec?: ParsedOpenAPISpec;
        error?: string;
        sourceUrl?: string;
        resolvedFrom?: string;
      };
      if (!res.ok || !data.spec) {
        throw new Error(data.error || "Fetch failed.");
      }
      applySpec(
        data.spec,
        label ||
          (data.resolvedFrom
            ? `Swagger UI → ${data.sourceUrl}`
            : data.sourceUrl || targetUrl)
      );
    } catch (err) {
      setSpec(null);
      setError(err instanceof Error ? err.message : "Fetch failed.");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    await parseContent(text, file.name);
  };

  const filteredEndpoints = React.useMemo(() => {
    if (!spec) return [] as ParsedOpenAPIEndpoint[];
    const q = query.trim().toLowerCase();
    return spec.endpoints.filter((ep) => {
      const tagOk =
        tagFilter === "all" || ep.tags.includes(tagFilter);
      if (!tagOk) return false;
      if (!q) return true;
      return (
        ep.name.toLowerCase().includes(q) ||
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.tags.some((t) => t.toLowerCase().includes(q)) ||
        (ep.operationId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [spec, query, tagFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const ep of filteredEndpoints) next.add(ep.id);
      return next;
    });
  };

  const clearVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const ep of filteredEndpoints) next.delete(ep.id);
      return next;
    });
  };

  const importSelected = async () => {
    if (!spec || selected.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const { importEndpoints } = await import("@/app/actions/endpoints");
      const payload = spec.endpoints
        .filter((ep) => selected.has(ep.id))
        .map((ep) => ({
          name: ep.name,
          url: serverOverride
            ? `${serverOverride.replace(/\/$/, "")}${ep.path.startsWith("/") ? ep.path : `/${ep.path}`}`
            : ep.url,
          method: ep.method,
          description: ep.description,
          tags: [...ep.tags, "openapi"],
          // Credentials are not in the spec — import as unauthenticated.
          authType: "none",
        }));

      const result = await importEndpoints(payload);
      if (result.error) {
        setError(result.error);
        return;
      }

      setImportedCount(result.count);
      setSkippedCount(result.skipped ?? 0);
      if ((result.skipped ?? 0) === 0) {
        router.push("/endpoints");
        router.refresh();
      }
    } finally {
      setImporting(false);
    }
  };

  const tags = spec
    ? Object.entries(spec.tagCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Source panel */}
      <div className="flex w-full shrink-0 flex-col border-b border-border lg:w-[380px] lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link href="/endpoints" className="hover:text-foreground">
              Endpoints
            </Link>
            <span>/</span>
            <span className="text-foreground">Import OpenAPI</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Import OpenAPI
          </h1>
          <p className="mt-1 text-sm text-muted">
            Upload JSON/YAML, paste a Swagger UI or OpenAPI URL, or use a preset.
          </p>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="mb-4">
            <Label className="mb-2 block">Presets</Label>
            <div className="space-y-2">
              {OPENAPI_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTab("url");
                    setUrl(preset.url);
                    void fetchUrl(preset.url, preset.name);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors cursor-pointer hover:border-[#3f3f46] hover:bg-surface-elevated disabled:opacity-50",
                    sourceLabel === preset.name && "border-accent/50 bg-accent-muted"
                  )}
                >
                  <span className="text-sm font-medium">{preset.name}</span>
                  <span className="mt-0.5 text-[11px] text-muted">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as SourceTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="url" className="flex-1">
                URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                Upload
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex-1">
                Paste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="openapi-url">OpenAPI / Swagger URL</Label>
                <Input
                  id="openapi-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/docs/ or …/openapi.yaml"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                className="w-full gap-1.5"
                disabled={loading || !url.trim()}
                onClick={() => void fetchUrl(url.trim())}
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Fetch & detect
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="mt-4 space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) void onFile(file);
                }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center transition-colors cursor-pointer hover:border-[#3f3f46] hover:bg-surface-elevated disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin text-muted" />
                ) : (
                  <Upload className="size-5 text-muted" />
                )}
                <span className="text-sm">Drop or choose a file</span>
                <span className="text-[11px] text-muted">
                  .json · .yaml · .yml
                </span>
              </button>
            </TabsContent>

            <TabsContent value="paste" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="openapi-paste">Document</Label>
                <textarea
                  id="openapi-paste"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={'openapi: "3.1.0"\ninfo:\n  title: …'}
                  className="min-h-40 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                className="w-full gap-1.5"
                disabled={loading || !paste.trim()}
                onClick={() => void parseContent(paste, "Pasted document")}
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileJson className="size-3.5" />
                )}
                Parse document
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="server-override">Base server URL (optional)</Label>
            <Input
              id="server-override"
              value={serverOverride}
              onChange={(e) => setServerOverride(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted">
              Overrides the spec server when building endpoint URLs.
            </p>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Results / selection */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!spec ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <FileJson className="size-8 text-muted" strokeWidth={1.25} />
            <h2 className="mt-4 text-sm font-medium">No document loaded</h2>
            <p className="mt-1 max-w-sm text-xs text-muted leading-relaxed">
              Use the OpenAI preset, paste a Swagger/OpenAPI URL, or upload a
              JSON/YAML file to detect endpoints for bulk import.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight">
                    {spec.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {sourceLabel} · OpenAPI {spec.openapiVersion} · v
                    {spec.version} · {spec.endpoints.length} operations · auth{" "}
                    <span className="font-mono">{spec.authType}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || importing}
                  onClick={() => void importSelected()}
                  className="gap-1.5"
                >
                  {importing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Import {selected.size} endpoint
                  {selected.size === 1 ? "" : "s"}
                </Button>
              </div>

              {importedCount != null ? (
                <p className="mt-2 text-xs text-success">
                  Imported {importedCount} endpoints
                  {skippedCount ? ` · skipped ${skippedCount} (plan limit)` : ""}.
                  {skippedCount ? (
                    <>
                      {" "}
                      <Link href="/settings/billing" className="underline">
                        Upgrade
                      </Link>{" "}
                      to import more, or edit auth on imported endpoints before
                      checking.
                    </>
                  ) : (
                    " Auth is set to none — edit endpoints if credentials are required."
                  )}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-muted">
                  Imported operations start with auth=none. Add credentials on
                  each endpoint after import if needed.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1 max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter operations…"
                    className="h-8 pl-8"
                  />
                </div>
                <button
                  type="button"
                  onClick={selectVisible}
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  Select visible
                </button>
                <span className="text-border">·</span>
                <button
                  type="button"
                  onClick={clearVisible}
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  Clear visible
                </button>
                <span className="text-border">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(new Set(spec.endpoints.map((e) => e.id)))
                  }
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  Select all
                </button>
              </div>

              {tags.length > 0 ? (
                <div className="mt-3 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                  <TagChip
                    active={tagFilter === "all"}
                    onClick={() => setTagFilter("all")}
                    label={`All (${spec.endpoints.length})`}
                  />
                  {(showAllTags ? tags : tags.slice(0, 12)).map(
                    ([tag, count]) => (
                      <TagChip
                        key={tag}
                        active={tagFilter === tag}
                        onClick={() => setTagFilter(tag)}
                        label={`${tag} (${count})`}
                      />
                    )
                  )}
                  {!showAllTags && tags.length > 12 ? (
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[11px] text-muted hover:text-foreground"
                      onClick={() => setShowAllTags(true)}
                    >
                      +{tags.length - 12} more
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="hidden border-b border-border-subtle px-5 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[28px_72px_1fr_160px] sm:gap-3">
              <span />
              <span>Method</span>
              <span>Operation</span>
              <span>Tags</span>
            </div>

            <div className="flex-1 overflow-auto">
              {filteredEndpoints.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-muted">
                  No operations match this filter.
                </p>
              ) : (
                filteredEndpoints.map((ep) => {
                  const checked = selected.has(ep.id);
                  return (
                    <label
                      key={ep.id}
                      className={cn(
                        "grid cursor-pointer grid-cols-[28px_1fr] items-start gap-3 border-b border-border-subtle px-5 py-3 transition-colors hover:bg-surface sm:grid-cols-[28px_72px_1fr_160px] sm:items-center",
                        checked && "bg-accent-muted/40"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(ep.id)}
                        className="mt-1 size-3.5 accent-[var(--accent)] sm:mt-0"
                      />
                      <div className="sm:contents">
                        <MethodBadge method={ep.method} className="mt-0.5 sm:mt-0" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {ep.name}
                            </span>
                            {ep.deprecated ? (
                              <span className="text-[10px] uppercase tracking-wide text-warning">
                                Deprecated
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate font-mono text-[11px] text-muted">
                            {ep.path}
                          </div>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-muted sm:mt-0">
                          {ep.tags.join(", ")}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-2 text-[11px] text-muted">
              <span>
                {selected.size} selected · {filteredEndpoints.length} visible
              </span>
              {spec.servers[0] ? (
                <span className="truncate font-mono">{spec.servers[0]}</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-[11px] transition-colors cursor-pointer",
        active
          ? "bg-surface-elevated text-foreground"
          : "text-muted hover:text-foreground hover:bg-surface"
      )}
    >
      {label}
    </button>
  );
}
