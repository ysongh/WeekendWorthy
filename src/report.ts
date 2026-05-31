import type { DistilledProblem, Hackathon } from "./types.js";

const scoreSum = (p: DistilledProblem): number =>
  p.scores.realDemand + p.scores.buildability + p.scores.originality;

/** Markdown-escape pipes/newlines so a cell can't break a table row. */
function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Render distilled problems as a Markdown report: a ranked summary table
 * followed by one detail section per problem. Problems are assumed
 * pre-sorted desc by score sum (the distiller sorts), but we sort again
 * defensively so the report is correct regardless of input order.
 */
export function renderMarkdown(h: Hackathon, problems: DistilledProblem[]): string {
  const sorted = [...problems].sort((a, b) => scoreSum(b) - scoreSum(a));
  const generated = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push(`# ${h.name} — buildable problems`);
  lines.push("");
  lines.push(`_Generated ${generated} · ${sorted.length} problem${sorted.length === 1 ? "" : "s"} passed the bar._`);
  lines.push("");

  if (sorted.length === 0) {
    lines.push("No problems met the bar this run.");
    lines.push("");
    return lines.join("\n");
  }

  // Summary table
  lines.push("| # | Score | Problem | Demand | Build | Orig | Source |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  sorted.forEach((p, i) => {
    const n = i + 1;
    lines.push(
      `| ${n} | ${scoreSum(p)} | [${cell(p.problem)}](#${n}-${slug(p.problem)}) | ${p.scores.realDemand} | ${p.scores.buildability} | ${p.scores.originality} | [link](${p.sourceUrl}) |`,
    );
  });
  lines.push("");

  // Detail sections
  sorted.forEach((p, i) => {
    const n = i + 1;
    lines.push(`## ${n}. ${p.problem}`);
    lines.push("");
    lines.push(
      `**Score ${scoreSum(p)}** — demand ${p.scores.realDemand} · buildability ${p.scores.buildability} · originality ${p.scores.originality}`,
    );
    lines.push("");
    lines.push(`- **Who has it:** ${p.whoHasIt}`);
    lines.push(`- **Evidence:** ${p.evidence}`);
    lines.push(`- **Buildable angle:** ${p.buildableAngle}`);
    lines.push(`- **Theme/sponsor fit:** ${p.themeFit}`);
    lines.push(`- **Source:** ${p.sourceUrl}`);
    lines.push("");
  });

  return lines.join("\n");
}

/** GitHub-style anchor slug for in-page links. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
