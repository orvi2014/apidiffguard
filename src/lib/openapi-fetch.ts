import {
  extractEndpointsFromOpenAPI,
  findSwaggerUiFollowUpUrls,
  looksLikeHtml,
  looksLikeSwaggerInitJs,
  OpenAPIParseError,
  parseOpenAPIContent,
  pickServerForDocsHost,
  type ParsedOpenAPISpec,
} from "@/lib/openapi";
import {
  MAX_FETCH_BYTES,
  parseAndAssertPublicUrl,
  readResponseTextLimited,
  safeFetch,
} from "@/lib/safe-url";

const FETCH_HEADERS = {
  Accept:
    "application/json, application/javascript, application/yaml, text/yaml, text/html, text/plain, */*",
  "User-Agent": "APIDiffGuard/0.1 (+https://apidiffguard.com)",
};

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  parseAndAssertPublicUrl(url);
  const response = await safeFetch(url, {
    headers: FETCH_HEADERS,
    timeoutMs,
    method: "GET",
  });

  if (!response.ok) {
    throw new OpenAPIParseError(
      `Failed to fetch ${url} (${response.status} ${response.statusText}).`
    );
  }

  const text = await readResponseTextLimited(response, MAX_FETCH_BYTES);
  if (!text.trim()) {
    throw new OpenAPIParseError(`Fetched document was empty: ${url}`);
  }
  return text;
}

function isLikelyOpenApiPayload(next: string): boolean {
  if (looksLikeSwaggerInitJs(next)) return true;
  const head = next.trim().slice(0, 80);
  return (
    head.startsWith("{") ||
    head.startsWith("openapi:") ||
    head.startsWith("swagger:") ||
    head.startsWith("---")
  );
}

export async function loadOpenAPISpecFromUrl(
  rawUrl: string,
  options: { serverUrl?: string } = {}
): Promise<{
  spec: ParsedOpenAPISpec;
  sourceUrl: string;
  resolvedFrom?: string;
}> {
  const pageUrl = parseAndAssertPublicUrl(rawUrl).toString();
  let content = await fetchText(pageUrl);
  let sourceUrl = pageUrl;
  let resolvedFrom: string | undefined;

  if (looksLikeHtml(content)) {
    const candidates = findSwaggerUiFollowUpUrls(content, pageUrl).slice(0, 8);
    let loaded = false;
    let lastError = "";

    for (const candidate of candidates) {
      try {
        parseAndAssertPublicUrl(candidate);
        const next = await fetchText(candidate);
        if (looksLikeHtml(next)) continue;
        if (!isLikelyOpenApiPayload(next)) continue;
        content = next;
        resolvedFrom = pageUrl;
        sourceUrl = candidate;
        loaded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!loaded) {
      throw new OpenAPIParseError(
        `Could not resolve an OpenAPI document from Swagger UI at ${pageUrl}. Tried ${candidates.length} candidates.${lastError ? ` Last error: ${lastError}` : ""}`
      );
    }
  }

  const document = parseOpenAPIContent(content);
  const initial = extractEndpointsFromOpenAPI(document, {
    serverUrl: options.serverUrl,
  });

  if (options.serverUrl) {
    return { spec: initial, sourceUrl, resolvedFrom };
  }

  const preferred = pickServerForDocsHost(initial.servers, pageUrl);
  if (preferred && preferred !== initial.servers[0]) {
    return {
      spec: extractEndpointsFromOpenAPI(document, { serverUrl: preferred }),
      sourceUrl,
      resolvedFrom,
    };
  }

  return { spec: initial, sourceUrl, resolvedFrom };
}
