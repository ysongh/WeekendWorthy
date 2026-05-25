import type { DistilledProblem, Hackathon, ScrapedResult } from "./types.js";

export const DISTILL_SYSTEM_PROMPT = `You are a hackathon scout. From raw web content, extract ONLY genuine, evidenced problems that a small team could prototype end-to-end in 24–48 hours.

HARD REJECT — do not include any item that is:
- A vague aspiration ("AI should help society", "better tools for X")
- A pure feature-request on an existing product (without a clear standalone build)
- A months-long engineering project (custom silicon, new ML model from scratch, regulatory work)
- A listicle item with no underlying complaint, user, or quote
- A duplicate of another item already in the list (merge them)

ACCEPT only when ALL of the following hold:
1. There is a real, identifiable person or group who has the problem (quoted, named, or clearly implied by the source).
2. The pain is concrete (a specific workflow, broken step, missing artifact) — not "things are hard".
3. A weekend prototype could plausibly demonstrate value, even if not production-ready.
4. There is a buildable angle: a specific MVP shape (a script, a small webapp, a bot, a CLI, an integration).

For each accepted problem, score 1–10 on:
- realDemand: how strong is the evidence that someone actually wants this? (quoted pain = high; inferred = low)
- buildability: can a 2–3 person team ship a demo in 48h?
- originality: how non-obvious / under-served is this vs. existing tools?

OUTPUT FORMAT — return ONLY a JSON array, no prose, no markdown fences. Sort by (realDemand + buildability + originality) descending. Each item:
{
  "problem": "one sentence stating the problem",
  "whoHasIt": "who experiences it (role, context)",
  "evidence": "short quote or paraphrase from the source proving the pain is real",
  "sourceUrl": "the URL the evidence came from",
  "buildableAngle": "the specific MVP shape — what you would actually build in 48h",
  "themeFit": "which hackathon theme/sponsor this maps to and why",
  "scores": { "realDemand": <1-10>, "buildability": <1-10>, "originality": <1-10> }
}

If nothing in the input meets the bar, return [].`;

export function buildDistillUserMessage(h: Hackathon, results: ScrapedResult[]): string {
  const header = `Hackathon: ${h.name}\nThemes: ${h.themes.join(", ")}\nSponsors: ${h.sponsors.join(", ")}\n\nRaw scraped sources follow. Each block is one result.\n`;
  const body = results
    .map(
      (r, i) =>
        `\n--- SOURCE ${i + 1} ---\nURL: ${r.url}\nTITLE: ${r.title}\nQUERY: ${r.query}\nCONTENT:\n${r.content}\n`,
    )
    .join("");
  return header + body;
}

/** Strip ```json fences and parse, returning [] on any failure. */
export function safeParseProblems(raw: string): DistilledProblem[] {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as DistilledProblem[];
    return [];
  } catch {
    return [];
  }
}

export async function distill(
  h: Hackathon,
  results: ScrapedResult[],
  apiKey: string,
): Promise<DistilledProblem[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 8000,
      system: DISTILL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildDistillUserMessage(h, results) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = json.content.find((c) => c.type === "text")?.text ?? "";
  if (process.env.DEBUG_DISTILL) {
    const fs = await import("node:fs");
    const userMsg = buildDistillUserMessage(h, results);
    fs.writeFileSync("distill-raw.txt", text);
    fs.writeFileSync("distill-input.txt", userMsg);
    process.stderr.write(
      `[debug] reply=${text.length} chars → distill-raw.txt; input=${userMsg.length} chars → distill-input.txt\n`,
    );
  }
  return safeParseProblems(text);
}
