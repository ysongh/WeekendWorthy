import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScrapedResult } from "./types.js";

const CACHE_DIR = ".cache/nimble";

type CacheEntry = {
  query: string;
  searchDepth: string;
  maxResults: number;
  cachedAt: string;
  results: ScrapedResult[];
};

export function cacheKey(query: string, searchDepth: string, maxResults: number): string {
  return createHash("sha256")
    .update(`${query}|${searchDepth}|${maxResults}`)
    .digest("hex")
    .slice(0, 16);
}

function ttlMs(): number {
  const days = Number(process.env.NIMBLE_CACHE_TTL_DAYS ?? 7);
  return days * 24 * 60 * 60 * 1000;
}

export function cacheDisabled(): boolean {
  return process.env.NIMBLE_CACHE === "off";
}

export async function getCached(key: string): Promise<ScrapedResult[] | null> {
  if (cacheDisabled()) return null;
  try {
    const raw = await readFile(join(CACHE_DIR, `${key}.json`), "utf8");
    const entry = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > ttlMs()) return null;
    return entry.results;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  query: string,
  searchDepth: string,
  maxResults: number,
  results: ScrapedResult[],
): Promise<void> {
  if (cacheDisabled()) return;
  await mkdir(CACHE_DIR, { recursive: true });
  const entry: CacheEntry = {
    query,
    searchDepth,
    maxResults,
    cachedAt: new Date().toISOString(),
    results,
  };
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(entry, null, 2));
}
