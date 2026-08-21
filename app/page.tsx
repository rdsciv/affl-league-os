import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule, ModuleAction } from "@/components/modules/PreviewModule";
import { StandingsPreview } from "@/components/modules/CompactStandings";
import { BudgetBars } from "@/components/modules/AuctionSnapshot";
import { PointSourceBar } from "@/components/modules/PointSourceBar";
import { PowerLuckSlope } from "@/components/modules/PowerLuckSlope";
import { MatchupCard, SkillProfile } from "@/components/modules/MatchupPulse";
import { franchiseAsset } from "@/components/data/TeamMark";
import { asset } from "@/lib/asset";
import { loadShowcase } from "@/lib/data/load";
import {
  formatInt,
  formatMoney,
  formatPoints,
  formatRecord,
  selectAdaptiveHome,
  selectAuctionValue,
  selectBudgetConcentration,
  selectManagementRanked,
  selectNotableMatchups,
  selectPowerVsFinish,
  selectSeasonSummary,
  selectSkillProfile,
  selectStandingsPreview,
  summarisePointSources,
} from "@/lib/data/selectors";
import styles from "./control-room.module.css";

export const metadata: Metadata = {
  title: "Control Room",
  description:
    "The adaptive AFFL control room — current league state, Auction HQ, and the latest completed season.",
};

export default function ControlRoomPage() {
  const snapshot = loadShowcase();
  const mode = selectAdaptiveHome(snapshot, new Date());
  const season = snapshot.latestCompletedSeason;
  const summary = selectSeasonSummary(snapshot, season);

  const standings = selectStandingsPreview(snapshot, season);
  const powerRows = selectPowerVsFinish(snapshot, season);
  const budgets = selectBudgetConcentration(snapshot);
  const auctionValue = selectAuctionValue(snapshot);
  const sources = summarisePointSources(snapshot, season);
  const management = selectManagementRanked(snapshot, season);
  const matchups = selectNotableMatchups(snapshot, 3);
  const skill = selectSkillProfile(snapshot);

  const champion = summary?.champion ?? null;
  const championRow = summary?.standings.find((t) => t.teamId === champion?.teamId);
  const sacco = summary?.sacco ?? null;
  const crest = champion ? franchiseAsset(champion.franchiseId, season) : null;

  const franchiseOf = (teamId: number) =>
    summary?.standings.find((t) => t.teamId === teamId)?.franchiseId;

  const bestManager = management[0];
  const worstManager = management[management.length - 1];

  return (
    <AppShell
      current="/"
      phase={mode === "off-season" ? "Off-season" : "In season"}
      status={[
        { label: "Latest season", value: String(season) },
        { label: "Seasons on record", value: String(snapshot.seasons.length) },
        { label: "Franchises", value: String(snapshot.franchises.length) },
        { label: "AFFL 2026", value: "no statistical season until the draft" },
      ]}
    >
      <div className={styles.grid}>
        {/* ------------------------------------------------------- hero --- */}
        <section className={`${styles.hero} u-grain`}>
          <span className="u-streaks" aria-hidden="true" />
          <div className={styles.heroBody}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroEyebrow}>AFFL {season} · Final</span>
              <span className={`${styles.heroName} u-liquid`}>
                {champion?.teamName ?? "Season on record"}
              </span>
            </h1>
            {championRow ? (
              <p className={styles.heroLede}>
                Took the {season} title at{" "}
                <b>{formatRecord(championRow.wins, championRow.losses, championRow.ties)}</b> with{" "}
                <b>{formatPoints(championRow.pointsFor)}</b> points scored — the league&rsquo;s best
                all-play record and its highest single week.
              </p>
            ) : null}

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>
                  {championRow?.powerRank ? `#${championRow.powerRank}` : "—"}
                </span>
                <span className={styles.heroStatLabel}>Power rank</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>
                  {formatPoints(summary?.highScore?.points)}
                </span>
                <span className={styles.heroStatLabel}>
                  High week · wk {summary?.highScore?.week ?? "—"}
                </span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{formatMoney(summary?.auctionSpend)}</span>
                <span className={styles.heroStatLabel}>Auction spend</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{formatInt(summary?.teamCount)}</span>
                <span className={styles.heroStatLabel}>Teams</span>
              </div>
            </div>
          </div>

          <div className={styles.heroCrest}>
            {crest && champion ? (
              <span className={styles.crestImage}>
                <Image src={asset(crest)} alt="" width={132} height={132} aria-hidden="true" />
              </span>
            ) : null}
            <p className={styles.crestCaption}>
              {sacco ? (
                <>
                  Sacco: <b>{sacco.teamName}</b>
                  <br />
                </>
              ) : null}
              {summary?.highScore ? (
                <>
                  High week: <b>{summary.highScore.teamName}</b> {formatPoints(summary.highScore.points)}{" "}
                  over {summary.highScore.opponentName}
                </>
              ) : null}
            </p>
            <Link href={`/exports/${season}-champion`} className="u-eyebrow">
              Open the {season} share card →
            </Link>
          </div>
        </section>

        {/* -------------------------------------------------- auction HQ --- */}
        <div className={styles.sectionLabel}>
          <h2>Auction HQ</h2>
          <p>Where the off-season actually starts</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span7}>
          <PreviewModule
            id="auction-budgets"
            tone="lead"
            title="Budget architecture"
            summary={`Every roster gets the same cap, so what separates them is concentration — the share committed to their top three buys.`}
            conclusion={`${Math.round((budgets[0]?.concentration ?? 0) * 100)}%`}
            conclusionNote={
              budgets[0] && budgets[budgets.length - 1]
                ? `of ${budgets[0].teamName}'s budget went to three players — the most concentrated build in ${season}. ${
                    budgets[budgets.length - 1]!.teamName
                  } spread it widest at ${Math.round(
                    (budgets[budgets.length - 1]!.concentration ?? 0) * 100,
                  )}%.`
                : undefined
            }
            rows={[]}
            evidence={snapshot.auctionBudgets.evidenceStatus}
            provenance={snapshot.auctionBudgets.provenance}
            openHref="/front-office?explore=auction"
            openLabel="Open auction board"
          >
            <BudgetBars rows={budgets} franchiseOf={franchiseOf} season={season} />
          </PreviewModule>
        </div>

        <div className={styles.span5}>
          <PreviewModule
            id="auction-value"
            title="Auction return"
            summary="Points above replacement per dollar committed. At the top of this list the dollar is always $1 — the cheapest flyers return more per dollar than any star can."
            conclusion={auctionValue[0] ? auctionValue[0].playerName : "—"}
            conclusionNote={
              auctionValue[0]
                ? `a ${formatMoney(auctionValue[0].bid)} buy that returned ${formatPoints(
                    auctionValue[0].par,
                  )} points above replacement for ${auctionValue[0].teamName}`
                : undefined
            }
            rows={auctionValue.slice(1).map((pick) => (
              <span key={pick.playerId} className={styles.statLine}>
                <span className={styles.statLineLabel}>
                  {pick.playerName} · {pick.teamName}
                </span>
                <b>{formatMoney(pick.bid)}</b>
                <b>+{formatPoints(pick.par)}</b>
              </span>
            ))}
            evidence={snapshot.auction.evidenceStatus}
            provenance={snapshot.auction.provenance}
            openHref="/front-office?explore=auction"
            openLabel="Open auction board"
            actions={
              <ModuleAction href="/front-office?explore=auction-busts">
                Biggest misses
              </ModuleAction>
            }
          />
        </div>

        {/* ------------------------------------------------ season truth --- */}
        <div className={styles.sectionLabel}>
          <h2>Season {season}</h2>
          <p>Standings, quality, and what the schedule did about it</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span5}>
          <PreviewModule
            id="standings"
            title="Final standings"
            summary={`Top ${standings.length} of ${summary?.standings.length ?? 0} teams. Arrows compare playoff seed with final finish.`}
            rows={standings.map((team) => (
              <StandingsPreview key={team.teamId} teams={[team]} />
            ))}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
            openHref={`/season?season=${season}&explore=standings`}
            actions={<ModuleAction href={`/season?season=${season}`}>Season room</ModuleAction>}
          />
        </div>

        <div className={styles.span7}>
          <PreviewModule
            id="power-luck"
            title="Power against finish"
            summary="All-play power rank is what a team's scoring was worth against the whole field. The swing is what the schedule added or took away."
            rows={[]}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
            openHref={`/season?season=${season}&explore=power`}
            openLabel="Open power table"
          >
            <PowerLuckSlope rows={powerRows.slice(0, 6)} />
          </PreviewModule>
        </div>

        <div className={styles.span6}>
          {sources ? (
            <PreviewModule
              id="point-sources"
              title="Where the points came from"
              summary={`Every started point in ${season} traced to how the player was acquired.`}
              conclusion={`${Math.round((sources.segments[0]?.share ?? 0) * 100)}%`}
              conclusionNote="of started value came from the auction — the rest was built in-season."
              rows={[]}
              evidence={snapshot.pointSources.evidenceStatus}
              provenance={snapshot.pointSources.provenance}
              openHref="/front-office?explore=point-sources"
              openLabel="Open point sources"
            >
              <PointSourceBar segments={sources.segments} />
            </PreviewModule>
          ) : null}
        </div>

        <div className={styles.span6}>
          {bestManager && worstManager ? (
            <PreviewModule
              id="management"
              title="Management"
              summary="Actual lineup against the best legal lineup available that week."
              conclusion={`${formatPoints(worstManager.pointsLeftOnBench)}`}
              conclusionNote={`points left on ${worstManager.teamName}'s bench across the season — the widest gap in the league. ${bestManager.teamName} led at ${formatPoints(bestManager.managementScore)}% of optimal.`}
              rows={management.slice(0, 4).map((row) => (
                <span key={row.teamId} className={styles.statLine}>
                  <span className={styles.statLineLabel}>{row.teamName}</span>
                  <b>{formatPoints(row.managementScore)}%</b>
                  <b>−{formatPoints(row.pointsLeftOnBench)}</b>
                </span>
              ))}
              evidence={snapshot.management.evidenceStatus}
              provenance={snapshot.management.provenance}
              openHref="/front-office?explore=management"
              openLabel="Open management review"
            />
          ) : null}
        </div>

        <div className={styles.span7}>
          <PreviewModule
            id="notable-matchups"
            title="Notable games"
            summary={`The highest-combined matchups of ${season}.`}
            rows={[]}
            evidence={snapshot.matchups.evidenceStatus}
            provenance={snapshot.matchups.provenance}
            openHref={`/season?season=${season}&explore=matchups`}
            openLabel="Open matchups"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
              {matchups.map((m) => (
                <MatchupCard key={`${m.week}-${m.teamId}`} matchup={m} franchiseOf={franchiseOf} />
              ))}
            </div>
          </PreviewModule>
        </div>

        <div className={styles.span5}>
          {skill ? (
            <PreviewModule
              id="roto"
              title="Roster shape"
              summary={`${skill.teamName} led the ${season} roto standings. Bars show category rank against the field.`}
              conclusion={`${formatPoints(skill.totalPts)}`}
              conclusionNote="roto points across ten categories"
              rows={[]}
              evidence={snapshot.roto.evidenceStatus}
              provenance={snapshot.roto.provenance}
              openHref={`/season?season=${season}&explore=roto`}
              openLabel="Open roto standings"
            >
              <SkillProfile categories={skill.categories} />
            </PreviewModule>
          ) : null}
        </div>

        {/* ------------------------------------------------------- gated --- */}
        <div className={styles.gated}>
          <div className={styles.gatedHead}>
            <p className={styles.gatedTitle}>Not shown, and why</p>
            <p className={styles.gatedNote}>
              These modules are gated by source coverage. They are listed rather than rendered
              with estimated or zero-filled values.
            </p>
          </div>
          <div className={styles.gatedList}>
            <p className={styles.gatedItem}>
              <b>AFFL 2026</b>
              No statistical season exists before the draft. Planning membership never creates
              standings, records, or player seasons.
            </p>
            <p className={styles.gatedItem}>
              <b>Benches pre-2018</b>
              Weekly rosters, waivers and ownership stints were never collected before 2018.
            </p>
            <p className={styles.gatedItem}>
              <b>Player lines 2014–16</b>
              Lineup-derived points do not reconcile to team totals, so matchup player lines stay
              unavailable for those seasons.
            </p>
            <p className={styles.gatedItem}>
              <b>Trade grades</b>
              Trades are reconstructed from transaction items. No winner grade is published until
              the source history and grading contract are verified.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
