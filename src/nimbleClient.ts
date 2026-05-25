import type { ScrapedResult } from "./types.js";

const BASE_URL = "https://sdk.nimbleway.com/v1";

export type NimbleOptions = {
  apiKey: string;
  maxResults?: number;
  searchDepth?: "lite" | "fast" | "deep";
  /** Per-call delay in ms (stay well under 83 QPS). */
  delayMs?: number;
};

type NimbleResponse = {
  results?: Array<{
    title?: string;
    description?: string;
    url?: string;
    content?: string;
  }>;
  total_results?: number;
  request_id?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run one search query. Throws on hard errors; callers should catch per-query
 * so one bad query doesn't kill the run.
 */
export async function nimbleSearch(
  query: string,
  opts: NimbleOptions,
): Promise<ScrapedResult[]> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: opts.maxResults ?? 5,
      search_depth: opts.searchDepth ?? "deep",
      output_format: "markdown",
    }),
  });

  if (res.status === 402) {
    throw new Error("Nimble 402: budget/trial exhausted — top up or switch keys.");
  }
  if (res.status === 429) {
    throw new Error("Nimble 429: rate limited — increase delayMs or back off.");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nimble ${res.status}: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as NimbleResponse;
  const results = json.results ?? [];

  return results
    .filter((r) => r.url && (r.content || r.description))
    .map((r) => ({
      url: r.url!,
      title: r.title ?? "",
      content: (r.content || r.description || "").slice(0, 8000),
      query,
    }));
}

/** Run many queries sequentially, tolerating per-query failures. */
export async function nimbleSearchAll(
  queries: string[],
  opts: NimbleOptions,
): Promise<{ results: ScrapedResult[]; failures: Array<{ query: string; error: string }> }> {
  const results: ScrapedResult[] = [];
  const failures: Array<{ query: string; error: string }> = [];
  const delay = opts.delayMs ?? 150;

  for (const q of queries) {
    try {
      const r = await nimbleSearch(q, opts);
      results.push(...r);
      process.stderr.write(`  [ok] ${r.length} results — ${q}\n`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ query: q, error: msg });
      process.stderr.write(`  [fail] ${msg} — ${q}\n`);
      // If we hit a hard budget error, stop early.
      if (msg.includes("402")) break;
    }
    if (delay > 0) await sleep(delay);
  }

  return { results, failures };
}
