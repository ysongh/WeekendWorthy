# WeekendWorthy

CLI that finds buildable hackathon problems by web-scraping (Nimble) and distilling with Claude.

## Run

```
pnpm install
# .env: NIMBLE_API_KEY, ANTHROPIC_API_KEY
pnpm find         # full run
pnpm find:dev     # DEV_LIMIT=2, cheap dev run
```

Node 20+, ESM, TypeScript. Package manager: pnpm.

## Layout

- [src/index.ts](src/index.ts) — orchestrator + `HACKATHON` config at top (edit themes/sponsors here); prints scored JSON to stdout
- [src/queryBuilder.ts](src/queryBuilder.ts) — `buildQueries(HACKATHON) → {query, focus}[]`
- [src/nimbleClient.ts](src/nimbleClient.ts) — `search()`; handles 402/429, inter-call delay, cache lookup/write
- [src/cache.ts](src/cache.ts) — disk cache for Nimble responses (`.cache/nimble/<key>.json`)
- [src/distillAgent.ts](src/distillAgent.ts) — sends scraped content to Claude, returns `Problem[]`
- [src/types.ts](src/types.ts) — shared types (`Problem`, `SearchResult`, etc.)

## Pipeline (3 stages)

1. **Query builder** — generates pain-where-it-lives queries (Ask HN, reddit "I wish there was an app", sponsor dev challenges, GitHub `help wanted`). Explicitly avoid "hackathon problems" — returns listicles.
2. **Nimble search** — `POST https://sdk.nimbleway.com/v1/search`, `Authorization: Bearer …`. Real page text requires `search_depth: "deep"`; dev defaults to `fast` to save budget. Use `focus: "social"` for reddit/HN queries. Response items: `{ title, description, url, content, extra_fields }`.
3. **Distillation** — `https://api.anthropic.com/v1/messages`, header `x-api-key`, model `claude-opus-4-7`. Strict system prompt rejects vague aspirations / feature requests / multi-month projects. Strip ` ```json ` fences before `JSON.parse`; handle parse failure gracefully.

## Output schema

JSON array sorted desc by score sum:
```
{ problem, whoHasIt, evidence, sourceUrl, buildableAngle, themeFit,
  scores: { realDemand, buildability, originality } }
```

## Cost & limits

- Nimble: 83 QPS default; `deep` depth is the most expensive — keep `DEV_LIMIT=2` while iterating.
- Anthropic: one Opus call per run with all scraped content concatenated.
- Add ~250ms delay between Nimble calls; per-query try/catch so one failure doesn't kill the run.

## Caching

- Nimble responses cached to `.cache/nimble/<key>.json` by `sha256(query|depth|maxResults)[:16]`.
- TTL: 7 days (`NIMBLE_CACHE_TTL_DAYS`). Bypass with `NIMBLE_CACHE=off`. Bust with `rm -rf .cache`.
- Cache hits skip the inter-call rate-limit delay.
- Distill output is intentionally **not** cached — it's the part being iterated on.

## Conventions

- ES modules; relative imports include `.js` extension (TS ESM requirement).
- No frameworks. Plain `fetch`.
- Secrets only from env — never hard-code.
- HACKATHON config lives at the top of [src/index.ts](src/index.ts), easy to edit.
