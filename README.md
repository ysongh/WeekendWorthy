# WeekendWorthy

CLI that scrapes the web for evidenced pain points and distills them into
weekend-buildable hackathon problems via Claude.

## Setup

```bash
cd weekendworthy
pnpm install
cp .env.example .env   # then fill in NIMBLE_API_KEY and ANTHROPIC_API_KEY
```

The `find` scripts load `.env` via Node's built-in `--env-file` flag — no
dotenv dependency. You can still override inline (e.g. `DEV_LIMIT=3 pnpm find`).

Edit the `HACKATHON` config at the top of [src/index.ts](src/index.ts) — set
`name`, `themes`, `sponsors`, optionally `year`.

## Run

```bash
pnpm find          # full sweep
DEV_LIMIT=3 pnpm find   # cap to 3 queries while iterating
```

JSON output (scored, sorted) goes to stdout; progress logs go to stderr, so
you can pipe:

```bash
pnpm find > problems.json
```

## Pipeline

1. **queryBuilder** — generates HN / Reddit / general / sponsor queries from the
   config. Avoids "hackathon problems" listicles; targets where pain actually
   lives (`Ask HN what would you build...`, `I wish there was an app...`,
   `<sponsor> developer challenges`).
2. **nimbleClient** — POSTs each query to `https://sdk.nimbleway.com/v1/search`,
   normalizes `{url, title, content}`. Per-query try/catch; stops early on
   `402` (budget exhausted); throws clear messages on `429`. 150 ms delay
   between calls (far under the 83 QPS limit).
3. **distillAgent** — sends all results to `claude-opus-4-7` with a strict
   system prompt that rejects vague aspirations / feature requests / multi-month
   projects, and returns a JSON array of scored problems. Strips ```json fences
   before parsing; returns `[]` on parse failure.

## Env vars

| Var | Required | Notes |
|-----|----------|-------|
| `NIMBLE_API_KEY` | yes | Bearer token for Nimble Search SDK |
| `ANTHROPIC_API_KEY` | yes | Used as `x-api-key` against Anthropic Messages API |
| `DEV_LIMIT` | no | Cap number of search queries (e.g. `3`) for cheap iteration |

## Cost per run (rough)

With the default config (2 themes + 2 sponsors → 18 queries × 5 results each,
`search_depth=lite`):

- **Nimble**: ~18 lite searches. Check your Nimble plan for per-search pricing
  (lite is the cheapest tier).
- **Anthropic**: one Opus call with ~18 × 5 × ~1–2k chars ≈ 40–80k input
  tokens + a few thousand output tokens. Order of single-digit dollars per run
  at current Opus pricing. Use `DEV_LIMIT=2` while iterating to keep runs at
  cents.

## Files

- [src/index.ts](src/index.ts) — orchestrator + `HACKATHON` config
- [src/queryBuilder.ts](src/queryBuilder.ts) — query templates
- [src/nimbleClient.ts](src/nimbleClient.ts) — Nimble search + error handling
- [src/distillAgent.ts](src/distillAgent.ts) — Claude system prompt + parse
- [src/types.ts](src/types.ts) — shared types
