/**
 * Derived UI selectors only.
 *
 * Nothing here invents a value. A selector may sort, slice, label or ratio
 * data that already arrived in an envelope; if the envelope is unavailable the
 * selector returns null so the caller renders an explanation instead of a zero.
 */

import type {
  AuctionPick,
  DataEnvelope,
  Franchise,
  ManagementRow,
  MatchupLine,
  PlayerSearchRow,
  PointSourceRow,
  RotoRow,
  SeasonSummary,
  ShowcaseSnapshot,
  TeamSeason,
} from "./contracts";
import { isAvailable } from "./contracts";

export const PREVIEW_ROW_LIMIT = 5;

/* ------------------------------------------------------------- adaptive --- */

export function selectAdaptiveHome(
  state: { latestCompletedSeason: number; activeSeason: number | null },
  _now: Date,
): "in-season" | "off-season" {
  // The calendar never creates a season. Only a real active season — one the
  // adapter published from source — flips the home surface.
  return state.activeSeason === null ? "off-season" : "in-season";
}

/* -------------------------------------------------------------- seasons --- */

export function selectSeasonSummary(
  snapshot: ShowcaseSnapshot,
  season: number,
): SeasonSummary | null {
  const env = snapshot.seasonSummaries[String(season)];
  return isAvailable(env) ? env.data : null;
}

export function selectSeasonEnvelope(
  snapshot: ShowcaseSnapshot,
  season: number,
): DataEnvelope<SeasonSummary> | undefined {
  return snapshot.seasonSummaries[String(season)];
}

export function selectStandings(snapshot: ShowcaseSnapshot, season: number): TeamSeason[] {
  return selectSeasonSummary(snapshot, season)?.standings ?? [];
}

export function selectStandingsPreview(
  snapshot: ShowcaseSnapshot,
  season: number,
  limit = PREVIEW_ROW_LIMIT,
): TeamSeason[] {
  return selectStandings(snapshot, season).slice(0, limit);
}

/** Team quality (all-play power) against schedule outcome (final rank). */
export function selectPowerVsFinish(
  snapshot: ShowcaseSnapshot,
  season: number,
): { teamName: string; franchiseId: string; powerRank: number; finalRank: number; netLuck: number }[] {
  return selectStandings(snapshot, season)
    .filter(
      (t): t is TeamSeason & { powerRank: number; finalRank: number } =>
        typeof t.powerRank === "number" && typeof t.finalRank === "number",
    )
    .map((t) => ({
      teamName: t.teamName,
      franchiseId: t.franchiseId,
      powerRank: t.powerRank,
      finalRank: t.finalRank,
      netLuck: t.netLuck ?? 0,
    }))
    .sort((a, b) => a.powerRank - b.powerRank);
}

/** The teams whose finish least matched their play, in either direction. */
export function selectLuckOutliers(snapshot: ShowcaseSnapshot, season: number, limit = 3) {
  return selectPowerVsFinish(snapshot, season)
    .map((t) => ({ ...t, swing: t.finalRank - t.powerRank }))
    .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing))
    .slice(0, limit);
}

/* ------------------------------------------------------------- matchups --- */

export function selectMatchups(snapshot: ShowcaseSnapshot): MatchupLine[] {
  return isAvailable(snapshot.matchups) ? snapshot.matchups.data : [];
}

export function selectNotableMatchups(snapshot: ShowcaseSnapshot, limit = PREVIEW_ROW_LIMIT) {
  const seen = new Set<string>();
  return selectMatchups(snapshot)
    .filter((m) => {
      const key = [m.week, ...[m.teamId, m.opponentId].sort((a, b) => a - b)].join(":");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.points + b.opponentPoints - (a.points + a.opponentPoints))
    .slice(0, limit);
}

export function selectWeeks(snapshot: ShowcaseSnapshot): number[] {
  return [...new Set(selectMatchups(snapshot).map((m) => m.week))].sort((a, b) => a - b);
}

/* -------------------------------------------------------------- auction --- */

export function selectAuction(snapshot: ShowcaseSnapshot): AuctionPick[] {
  return isAvailable(snapshot.auction) ? snapshot.auction.data : [];
}

export function selectAuctionBudgets(snapshot: ShowcaseSnapshot) {
  return isAvailable(snapshot.auctionBudgets) ? snapshot.auctionBudgets.data : [];
}

/**
 * Roster construction, not roster cost.
 *
 * Every team gets the same capped budget, so total spend is a flat line and
 * encodes nothing. What actually varies is concentration — the share of the
 * budget committed to the top three buys. High is stars-and-scrubs; low is a
 * balanced build.
 */
export function selectBudgetConcentration(snapshot: ShowcaseSnapshot) {
  const picks = selectAuction(snapshot);
  const byTeam = new Map<number, number[]>();
  for (const pick of picks) {
    const bids = byTeam.get(pick.teamId) ?? [];
    bids.push(pick.bid ?? 0);
    byTeam.set(pick.teamId, bids);
  }

  return selectAuctionBudgets(snapshot)
    .map((row) => {
      const bids = (byTeam.get(row.teamId) ?? []).sort((a, b) => b - a);
      const top3 = bids.slice(0, 3).reduce((a, b) => a + b, 0);
      return {
        ...row,
        top3,
        concentration: row.spend > 0 ? top3 / row.spend : 0,
      };
    })
    .sort((a, b) => b.concentration - a.concentration);
}

/** Best value per dollar among picks that actually cost something. */
export function selectAuctionValue(snapshot: ShowcaseSnapshot, limit = PREVIEW_ROW_LIMIT) {
  return selectAuction(snapshot)
    .filter((p) => (p.bid ?? 0) > 0 && p.parPerDollar !== null)
    .sort((a, b) => (b.parPerDollar ?? 0) - (a.parPerDollar ?? 0))
    .slice(0, limit);
}

export function selectAuctionBusts(snapshot: ShowcaseSnapshot, limit = PREVIEW_ROW_LIMIT) {
  return selectAuction(snapshot)
    .filter((p) => (p.bid ?? 0) >= 20 && p.par !== null)
    .sort((a, b) => (a.par ?? 0) - (b.par ?? 0))
    .slice(0, limit);
}

/* ----------------------------------------------------------------- roto --- */

export function selectRoto(snapshot: ShowcaseSnapshot): RotoRow[] {
  return isAvailable(snapshot.roto) ? snapshot.roto.data : [];
}

/** A team's ten roto categories as 0-1 strengths, for a skill profile. */
export function selectSkillProfile(snapshot: ShowcaseSnapshot, teamId?: number) {
  const rows = selectRoto(snapshot);
  if (rows.length === 0) return null;
  const row = teamId === undefined ? rows[0] : rows.find((r) => r.teamId === teamId);
  if (!row) return null;
  const fieldSize = rows.length;
  return {
    teamId: row.teamId,
    teamName: row.teamName,
    totalRank: row.totalRank,
    totalPts: row.totalPts,
    categories: row.categories.map((c) => ({
      ...c,
      // rank 1 is best; normalise so 1 -> 1.0 and last -> ~0.
      strength: fieldSize > 1 ? (fieldSize - c.rank) / (fieldSize - 1) : 1,
    })),
  };
}

/* -------------------------------------------------------- point sources --- */

export const SOURCE_SEGMENTS = [
  { key: "drafted", label: "Drafted", token: "--src-drafted" },
  { key: "tradedIn", label: "Traded in", token: "--src-traded" },
  { key: "waiver", label: "Waiver", token: "--src-waiver" },
  { key: "freeAgent", label: "Free agency", token: "--src-fa" },
] as const;

export function selectPointSources(
  snapshot: ShowcaseSnapshot,
  season?: number,
): PointSourceRow[] {
  const rows = isAvailable(snapshot.pointSources) ? snapshot.pointSources.data : [];
  return season === undefined ? rows : rows.filter((r) => r.season === season);
}

/**
 * League-wide split of started value by acquisition source.
 *
 * PAR is points *above replacement*, so a segment can legitimately be
 * negative. Shares are computed on magnitude so a bar stays readable, and the
 * signed total is reported separately rather than being clamped to zero.
 */
export function summarisePointSources(snapshot: ShowcaseSnapshot, season: number) {
  const rows = selectPointSources(snapshot, season);
  if (rows.length === 0) return null;

  const totals = {
    drafted: sum(rows.map((r) => r.drafted)),
    tradedIn: sum(rows.map((r) => r.tradedIn)),
    waiver: sum(rows.map((r) => r.waiver)),
    freeAgent: sum(rows.map((r) => r.freeAgent)),
  };
  const magnitude = Object.values(totals).reduce((a, b) => a + Math.abs(b), 0);

  return {
    season,
    total: sum(rows.map((r) => r.parTotal)),
    segments: SOURCE_SEGMENTS.map((seg) => ({
      key: seg.key,
      label: seg.label,
      token: seg.token,
      value: totals[seg.key],
      share: magnitude > 0 ? Math.abs(totals[seg.key]) / magnitude : 0,
    })),
  };
}

export function selectTeamPointSources(snapshot: ShowcaseSnapshot, season: number, teamId: number) {
  const row = selectPointSources(snapshot, season).find((r) => r.teamId === teamId);
  if (!row) return null;
  const magnitude =
    Math.abs(row.drafted) + Math.abs(row.tradedIn) + Math.abs(row.waiver) + Math.abs(row.freeAgent);
  return {
    ...row,
    segments: SOURCE_SEGMENTS.map((seg) => ({
      key: seg.key,
      label: seg.label,
      token: seg.token,
      value: row[seg.key],
      share: magnitude > 0 ? Math.abs(row[seg.key]) / magnitude : 0,
    })),
  };
}

/* ----------------------------------------------------------- management --- */

export function selectManagement(snapshot: ShowcaseSnapshot, season?: number): ManagementRow[] {
  const rows = isAvailable(snapshot.management) ? snapshot.management.data : [];
  return season === undefined ? rows : rows.filter((r) => r.season === season);
}

export function selectManagementRanked(snapshot: ShowcaseSnapshot, season: number) {
  return selectManagement(snapshot, season).sort(
    (a, b) => (b.managementScore ?? 0) - (a.managementScore ?? 0),
  );
}

/* ----------------------------------------------------------- franchises --- */

export function selectFranchise(
  snapshot: ShowcaseSnapshot,
  franchiseId: string,
): Franchise | null {
  return snapshot.franchises.find((f) => f.franchiseId === franchiseId) ?? null;
}

export function selectActiveFranchises(snapshot: ShowcaseSnapshot): Franchise[] {
  return snapshot.franchises.filter((f) => f.lastSeason === snapshot.latestCompletedSeason);
}

/** Season rows plus explicit hiatus markers, in chronological order. */
export function selectFranchiseTimeline(franchise: Franchise) {
  type Entry =
    | { kind: "season"; season: number; alias: Franchise["seasonAliases"][number] }
    | { kind: "hiatus"; season: number };

  const entries: Entry[] = franchise.seasonAliases.map((alias) => ({
    kind: "season" as const,
    season: alias.season,
    alias,
  }));
  for (const season of franchise.hiatusSeasons) {
    entries.push({ kind: "hiatus" as const, season });
  }
  return entries.sort((a, b) => a.season - b.season);
}

/* -------------------------------------------------------------- players --- */

export function selectPlayerIndex(snapshot: ShowcaseSnapshot): PlayerSearchRow[] {
  return isAvailable(snapshot.playerIndex) ? snapshot.playerIndex.data : [];
}

export function searchPlayers(
  snapshot: ShowcaseSnapshot,
  query: string,
  limit = 25,
): PlayerSearchRow[] {
  const rows = selectPlayerIndex(snapshot);
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, limit);
  return rows
    .filter((p) => p.name.toLowerCase().includes(q) || p.position.toLowerCase() === q)
    .slice(0, limit);
}

/* ------------------------------------------------------------- rivalries -- */

export function selectRivalries(snapshot: ShowcaseSnapshot) {
  return isAvailable(snapshot.rivalries) ? snapshot.rivalries.data : [];
}

export function selectRecords(snapshot: ShowcaseSnapshot) {
  return isAvailable(snapshot.records) ? snapshot.records.data : [];
}

/* ----------------------------------------------------------------- util --- */

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function formatPoints(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US")}`;
}

export function formatRecord(w: number, l: number, t: number): string {
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th");
}
