import type { Hackathon, SearchQuery } from "./types.js";

/**
 * Build queries that target sources where real, evidenced pain shows up.
 * Avoid "hackathon problems" — that returns listicles, not pain.
 */
export function buildQueries(h: Hackathon): SearchQuery[] {
  const year = h.year ?? new Date().getFullYear();
  const queries: SearchQuery[] = [];

  for (const theme of h.themes) {
    queries.push(
      {
        source: "hn",
        rationale: "HN 'what would you build' threads surface concrete personal pain.",
        query: `site:news.ycombinator.com "Ask HN" what would you build ${theme}`,
      },
      {
        source: "hn",
        rationale: "HN 'I wish' / 'biggest problem' phrasing finds unmet needs.",
        query: `site:news.ycombinator.com "I wish there was" ${theme}`,
      },
      {
        source: "reddit",
        rationale: "Reddit 'I wish there was an app' threads are first-person demand signals.",
        query: `site:reddit.com "I wish there was an app" ${theme}`,
      },
      {
        source: "reddit",
        rationale: "Subreddit-style complaints about tooling gaps.",
        query: `site:reddit.com "biggest problem with" ${theme}`,
      },
      {
        source: "general",
        rationale: "Year-stamped 'unsolved problems' posts curate recent active pain.",
        query: `biggest unsolved problems ${theme} ${year}`,
      },
      {
        source: "general",
        rationale: "Practitioner blog posts describing concrete missing tools.",
        query: `"there is no good tool for" ${theme}`,
      },
    );
  }

  for (const sponsor of h.sponsors) {
    queries.push(
      {
        source: "sponsor",
        rationale: "Sponsor's own developer-challenge posts state the problem they want solved.",
        query: `${sponsor} developer challenges ${year}`,
      },
      {
        source: "sponsor",
        rationale: "Sponsor track problem statements explicitly list buildable briefs.",
        query: `${sponsor} hackathon sponsor track problem statement`,
      },
      {
        source: "sponsor",
        rationale: "GitHub issues / forums where the sponsor's own users complain.",
        query: `site:github.com ${sponsor} "would be nice" OR "feature request"`,
      },
    );
  }

  return queries;
}

/** Optional dev cap so we don't burn API budget while iterating. */
export function limitQueries(queries: SearchQuery[], limit?: number): SearchQuery[] {
  if (!limit || limit <= 0) return queries;
  return queries.slice(0, limit);
}
