export type Hackathon = {
  name: string;
  themes: string[];
  sponsors: string[];
  year?: number;
};

export type SearchQuery = {
  query: string;
  source: "hn" | "reddit" | "general" | "sponsor";
  rationale: string;
};

export type ScrapedResult = {
  url: string;
  title: string;
  content: string;
  query: string;
};

export type DistilledProblem = {
  problem: string;
  whoHasIt: string;
  evidence: string;
  sourceUrl: string;
  buildableAngle: string;
  themeFit: string;
  scores: {
    realDemand: number;
    buildability: number;
    originality: number;
  };
};
