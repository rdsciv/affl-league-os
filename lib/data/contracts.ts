/**
 * The read-only AFFL data contract.
 *
 * Every domain response the product renders arrives inside a DataEnvelope, so
 * a component can always tell verified fact from reconstruction from absence.
 * `data: null` means unavailable and always carries a `missingReason`; an
 * empty array means the source covered the request and found no rows.
 *
 * Missing values never become 0, NaN, "", a fabricated rank, or a fabricated
 * record. Rendering code must branch on `evidenceStatus`, not on truthiness.
 */

export type EvidenceStatus = "verified" | "reconstructed" | "unavailable";

export type MissingReason =
  | "not_applicable"
  | "outside_source_coverage"
  | "source_not_collected"
  | "join_unresolved"
  | "validation_failed"
  | "not_published";

export type SourceId =
  | "hermes-duckdb"
  | "cc-sqlite"
  | "hermes-json"
  | "pillars-json";

export type SourceTier = "ledger" | "semantic" | "publish" | "specialist";

export interface Provenance {
  sourceId: SourceId;
  sourceTier: SourceTier;
  tablesOrArtifact: string[];
  adapterVersion: string;
  queryId: string;
  sourceChecksum?: string;
  sourceGeneratedAt?: string;
}

export interface Coverage {
  grain: string;
  available: boolean;
  evidenceStatus: EvidenceStatus;
  seasonFrom?: number;
  seasonTo?: number;
  reason?: string;
}

export interface DataEnvelope<T> {
  contractVersion: "affl-readonly-v1";
  domain: string;
  generatedAt: string;
  data: T | null;
  evidenceStatus: EvidenceStatus;
  provenance: Provenance[];
  coverage: Coverage;
  missingReason?: MissingReason;
  warnings: string[];
}

/* ------------------------------------------------------------ domain ----- */

export type AcquisitionSource = "Drafted" | "Traded in" | "Waiver" | "FA";

export type Phase = "regular" | "playoff" | "championship" | "combined";

/** One team's single season. `teamName` is the name used *that* season. */
export interface TeamSeason {
  season: number;
  teamId: number;
  franchiseId: string;
  teamName: string;
  abbrev: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffSeed: number | null;
  finalRank: number | null;
  powerRank: number | null;
  powerPct: number | null;
  netLuck: number | null;
}

export interface FranchiseSeasonAlias {
  season: number;
  teamName: string;
  teamId: number;
  finalRank: number | null;
  wins: number;
  losses: number;
  pointsFor: number;
}

/**
 * A franchise is the canonical continuity key. `currentName` is the current or
 * most recent team name; `seasonAliases` preserves every historical name.
 * `hiatusSeasons` are gaps in the timeline, never fabricated zero seasons.
 */
export interface Franchise {
  franchiseId: string;
  currentName: string;
  logo: string | null;
  logoAvailable: boolean;
  firstSeason: number;
  lastSeason: number;
  seasonCount: number;
  hiatusSeasons: number[];
  championships: number[];
  seasonAliases: FranchiseSeasonAlias[];
  nameEras: { teamName: string; from: number; to: number }[];
  totals: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    bestFinish: number | null;
  };
}

export interface MatchupLine {
  season: number;
  week: number;
  teamId: number;
  teamName: string;
  opponentId: number;
  opponentName: string;
  points: number;
  opponentPoints: number;
  result: "W" | "L" | "T";
  margin: number;
  isPlayoff: boolean;
}

export interface AuctionPick {
  season: number;
  overall: number;
  teamId: number;
  teamName: string;
  playerId: number;
  playerName: string;
  position: string;
  bid: number;
  par: number | null;
  totalPoints: number | null;
  parPerDollar: number | null;
}

export interface RotoRow {
  season: number;
  phase: Phase;
  teamId: number;
  teamName: string;
  totalPts: number;
  totalRank: number;
  categories: { key: string; label: string; value: number; rank: number; pts: number }[];
}

export interface PointSourceRow {
  season: number;
  teamId: number;
  teamName: string;
  parTotal: number;
  drafted: number;
  tradedIn: number;
  waiver: number;
  freeAgent: number;
}

export interface ManagementRow {
  season: number;
  teamId: number;
  teamName: string;
  actualPoints: number;
  optimalPoints: number;
  pointsLeftOnBench: number;
  managementScore: number;
  decisionsCostingWins: number;
}

export interface PlayerSeasonRow {
  season: number;
  teamId: number | null;
  teamName: string | null;
  position: string;
  nflTeam: string | null;
  bid: number | null;
  totalPoints: number;
  startedPoints: number;
  starts: number;
  weeksRostered: number;
  ppgStarted: number | null;
}

export interface PlayerProfile {
  playerId: number;
  name: string;
  position: string;
  nflTeam: string | null;
  seasons: PlayerSeasonRow[];
  career: {
    seasons: number;
    startedPoints: number;
    totalPoints: number;
    starts: number;
    franchises: number;
    bestSeason: { season: number; startedPoints: number } | null;
  };
}

export interface PlayerSearchRow {
  playerId: number;
  name: string;
  position: string;
  seasons: number;
  startedPoints: number;
  starts: number;
  lastSeason: number;
  lastTeamName: string | null;
}

export interface RivalryRow {
  franchiseA: string;
  franchiseB: string;
  nameA: string;
  nameB: string;
  games: number;
  winsA: number;
  winsB: number;
  ties: number;
  pointsA: number;
  pointsB: number;
  lastMeeting: number;
}

export interface RecordRow {
  key: string;
  label: string;
  value: number;
  unit: string;
  teamName: string;
  season: number;
  week: number | null;
}

export interface SeasonSummary {
  season: number;
  teamCount: number;
  regularWeeks: number;
  champion: { teamId: number; teamName: string; franchiseId: string } | null;
  sacco: { teamId: number; teamName: string; franchiseId: string } | null;
  highScore: {
    teamName: string;
    points: number;
    week: number;
    opponentName: string;
  } | null;
  standings: TeamSeason[];
  totalPoints: number;
  auctionSpend: number | null;
}

/* ------------------------------------------------------------ snapshot --- */

export interface QaGate {
  pass: boolean;
  detail: string;
  observed?: string;
}

export interface ShowcaseSnapshot {
  contractVersion: "affl-readonly-v1";
  generatedAt: string;
  adapterVersion: string;
  latestCompletedSeason: number;
  activeSeason: number | null;
  seasons: number[];
  seasonSummary: DataEnvelope<SeasonSummary>;
  seasonSummaries: Record<string, DataEnvelope<SeasonSummary>>;
  franchises: Franchise[];
  matchups: DataEnvelope<MatchupLine[]>;
  auction: DataEnvelope<AuctionPick[]>;
  auctionBudgets: DataEnvelope<
    { teamId: number; teamName: string; spend: number; picks: number; topBid: number }[]
  >;
  roto: DataEnvelope<RotoRow[]>;
  pointSources: DataEnvelope<PointSourceRow[]>;
  management: DataEnvelope<ManagementRow[]>;
  waivers: DataEnvelope<
    { season: number; teamId: number; teamName: string; adds: number; drops: number; waiverAdds: number; faAdds: number }[]
  >;
  trades: DataEnvelope<
    { tradeId: number; season: number; week: number; teams: string[]; playerCount: number }[]
  >;
  rivalries: DataEnvelope<RivalryRow[]>;
  records: DataEnvelope<RecordRow[]>;
  featuredPlayer: DataEnvelope<PlayerProfile>;
  playerIndex: DataEnvelope<PlayerSearchRow[]>;
  nflContext: DataEnvelope<Record<string, unknown>>;
  benchDetail: DataEnvelope<never>;
  preSeasonPlanning: DataEnvelope<never>;
  qa: {
    generatedAt: string;
    gates: Record<string, QaGate>;
    warnings: string[];
  };
}

/* -------------------------------------------------------------- guards --- */

export function isAvailable<T>(
  env: DataEnvelope<T> | undefined | null,
): env is DataEnvelope<T> & { data: T } {
  return !!env && env.data !== null && env.evidenceStatus !== "unavailable";
}

export const MISSING_REASON_COPY: Record<MissingReason, string> = {
  not_applicable: "Not applicable to this scope",
  outside_source_coverage: "Outside source coverage",
  source_not_collected: "Never collected at the source",
  join_unresolved: "Identity join unresolved",
  validation_failed: "Failed reconciliation",
  not_published: "Not published yet",
};
