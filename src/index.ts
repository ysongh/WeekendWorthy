import type { Hackathon } from "./types.js";
import { buildQueries, limitQueries } from "./queryBuilder.js";
import { nimbleSearchAll } from "./nimbleClient.js";
import { distill } from "./distillAgent.js";

// ---- Edit me ---------------------------------------------------------------
const HACKATHON: Hackathon = {
  name: "ETHGlobal New York 2026",
  themes: [
    "DeFi and stablecoins",
    "cross-chain and chain abstraction",
    "onchain AI agents and agentic payments",
    "account abstraction and wallets",
    "ENS and onchain identity",
    "prediction markets",
    "Web3 infrastructure",
  ],
  sponsors: [
    "Google Cloud",
    "ENS",
    "1inch",
    "Sui",
    "World",
    "Hedera",
    "LI.FI",
    "Arc",
    "Uniswap Foundation",
    "Chainlink",
    "Canton Foundation",
    "Ledger",
    "Dynamic",
    "Privy",
    "Unlink",
  ],
  year: 2026,
};

// ---------------------------------------------------------------------------

async function main() {
  const nimbleKey = process.env.NIMBLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!nimbleKey) throw new Error("Missing NIMBLE_API_KEY");
  if (!anthropicKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const devLimit = process.env.DEV_LIMIT ? Number(process.env.DEV_LIMIT) : undefined;

  const queries = limitQueries(buildQueries(HACKATHON), devLimit);
  process.stderr.write(`[1/3] ${queries.length} queries built${devLimit ? ` (DEV_LIMIT=${devLimit})` : ""}\n`);

  const { results, failures } = await nimbleSearchAll(
    queries.map((q) => q.query),
    {
      apiKey: nimbleKey,
      maxResults: 5,
      searchDepth: "lite",
      delayMs: 150,
    },
  );
  process.stderr.write(
    `[2/3] scraped ${results.length} results (${failures.length} query failures)\n`,
  );

  if (results.length === 0) {
    process.stderr.write("No results to distill — exiting.\n");
    console.log("[]");
    return;
  }

  process.stderr.write(`[3/3] distilling with Claude...\n`);
  const problems = await distill(HACKATHON, results, anthropicKey);
  process.stderr.write(`Done — ${problems.length} problems passed the bar.\n`);

  console.log(JSON.stringify(problems, null, 2));
}

main().catch((e) => {
  process.stderr.write(`FATAL: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
